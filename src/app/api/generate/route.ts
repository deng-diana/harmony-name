/**
 * /api/generate — SSE Streaming 版本
 *
 * 技术原理: Server-Sent Events (SSE)
 * ===================================
 * 普通 API:  前端发请求 → 等很久 → 一次性收到全部结果
 * SSE API:   前端发请求 → 后端每完成一步就推送一条消息 → 前端实时更新
 *
 * SSE 的数据格式 (纯文本，每行以 "data: " 开头):
 *   data: {"type":"progress","step":1,"message":"正在排八字..."}
 *   data: {"type":"progress","step":2,"message":"正在检索古诗词..."}
 *   data: {"type":"progress","step":3,"message":"Claude 正在取名..."}
 *   data: {"type":"result","data":{...最终结果...}}
 *
 * 浏览器用 EventSource 或 fetch + ReadableStream 来接收
 */
import { claude } from "@/lib/claude";
import { searchPoems } from "@/lib/retriever";
import { generateRequestSchema } from "@/lib/schemas";
import {
  createSystemPrompt,
  buildUserMessage,
  buildSurnameInstruction,
} from "@/lib/prompt";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** 进度步骤定义 */
const STEPS = {
  VALIDATE: { step: 1, total: 4, message: "Validating your destiny chart..." },
  RAG:      { step: 2, total: 4, message: "Searching ancient poetry archives..." },
  GENERATE: { step: 3, total: 4, message: "The naming master is contemplating..." },
  DONE:     { step: 4, total: 4, message: "Names revealed!" },
};

export async function POST(request: Request) {
  if (!process.env.CLAUDE_API_KEY) {
    return Response.json(
      { error: "Server configuration error", code: "ENV_MISSING" },
      { status: 500 }
    );
  }

  // 创建一个可写的 stream（管道）
  // 后端往里写数据 → 前端从另一头读数据 → 实时更新 UI
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  /** 向前端推送一条 SSE 消息 */
  const sendEvent = async (type: string, payload: Record<string, unknown>) => {
    const data = JSON.stringify({ type, ...payload });
    // SSE 格式要求: "data: " 开头，两个换行结尾
    await writer.write(encoder.encode(`data: ${data}\n\n`));
  };

  // 启动异步处理（不阻塞 response 返回）
  (async () => {
    try {
      // ===== Step 1: 验证请求 =====
      await sendEvent("progress", STEPS.VALIDATE);

      const body = await request.json();
      const parseResult = generateRequestSchema.safeParse(body);
      if (!parseResult.success) {
        await sendEvent("error", {
          error: "Invalid request",
          code: "VALIDATION_ERROR",
          details: parseResult.error.issues,
        });
        await writer.close();
        return;
      }

      const {
        gender,
        dayMaster,
        strength,
        favourableElements,
        avoidElements,
        surnamePreference,
        specifiedSurname,
        recommendedNameLength,
      } = parseResult.data;

      // ===== Step 2: RAG 检索诗词 =====
      await sendEvent("progress", STEPS.RAG);

      const ELEMENT_IMAGERY: Record<string, string> = {
        Wood: "春天 生长 树木 青翠 仁德 东风",
        Fire: "光明 热情 朝阳 辉煌 礼仪 南方",
        Earth: "大地 厚德 稳重 丰收 信义 中央",
        Metal: "秋天 坚毅 清白 明月 义气 西方",
        Water: "流水 智慧 深远 润泽 冬天 北方",
      };
      let poemsContextText = "";
      try {
        const imageryWords = favourableElements
          .map((el: string) => ELEMENT_IMAGERY[el] || el)
          .join(" ");
        const query = `中国古典诗词 ${imageryWords}`;
        const retrievedPoems = await searchPoems(query, 10);
        const FAME_LABEL: Record<number, string> = { 3: "⭐经典名篇", 2: "⭐名家作品", 1: "其他" };
        poemsContextText = retrievedPoems
          .map(
            (p, i) =>
              `[${i + 1}] [${FAME_LABEL[p.fameScore] || "其他"}] 《${p.title}》${p.author}(${p.dynasty}) | 出处:${p.source}\n    "${p.chunkText}"`
          )
          .join("\n");
      } catch {
        console.warn("RAG Search failed, proceeding with internal knowledge.");
      }

      // ===== Step 3: Claude 生成名字 =====
      await sendEvent("progress", STEPS.GENERATE);

      const surnameInstruction = buildSurnameInstruction(
        surnamePreference,
        specifiedSurname,
        dayMaster
      );

      const userMessage = buildUserMessage({
        gender,
        dayMaster,
        strength,
        favourableElements,
        avoidElements,
        surnameInstruction,
        recommendedNameLength,
      });

      const message = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        temperature: 0.7,
        system: createSystemPrompt(poemsContextText),
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = message.content.find((block) => block.type === "text");
      const content = textBlock?.text;

      if (!content) {
        await sendEvent("error", {
          error: "AI returned empty content",
          code: "EMPTY_RESPONSE",
        });
        await writer.close();
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          await sendEvent("error", {
            error: "AI returned invalid JSON",
            code: "PARSE_ERROR",
          });
          await writer.close();
          return;
        }
      }

      // ===== Step 4: 完成 =====
      await sendEvent("progress", STEPS.DONE);
      await sendEvent("result", { data: parsed });
    } catch (error: unknown) {
      console.error("API Error:", error);
      const errMessage = error instanceof Error ? error.message : String(error);
      await sendEvent("error", {
        error: "Failed to generate names",
        code: "API_ERROR",
        details: errMessage,
      });
    } finally {
      await writer.close();
    }
  })();

  // 立即返回 SSE stream response（不等处理完成）
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",     // 告诉浏览器这是 SSE
      "Cache-Control": "no-cache",              // 不要缓存
      Connection: "keep-alive",                 // 保持连接
    },
  });
}
