/**
 * 诗词向量数据库 Seed 脚本
 * ================================
 * 读取 process-poems.py 的输出 → 生成 embedding → 写入 Supabase
 *
 * 运行方式:
 *   npx tsx scripts/seed-supabase.ts
 *
 * 前置条件:
 *   1. 已运行 python3 scripts/process-poems.py (生成 poem-chunks.json)
 *   2. .env.local 里有 OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// 1. 初始化
// ============================================================
dotenv.config({ path: ".env.local" });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 用 Secret Key，因为我们要写入数据
);

// ============================================================
// 2. 配置
// ============================================================
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 维，$0.02/1M tokens
const BATCH_SIZE = 50; // 每批插入多少条 (Supabase 单次插入上限约 1000)
const EMBEDDING_BATCH_SIZE = 100; // OpenAI 支持批量 embedding (最多 2048 条/次)

// ============================================================
// 3. 类型定义
// ============================================================
interface PoemData {
  title: string;
  author: string;
  dynasty: string;
  full_content: string;
  source: string;
}

interface ChunkData {
  poem_index: number; // 对应 poems 数组的下标
  chunk_text: string;
  chunk_index: number;
}

interface InputData {
  poems: PoemData[];
  chunks: ChunkData[];
}

// ============================================================
// 4. 工具函数
// ============================================================
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RETRIES = 3;

/**
 * 带重试的 Supabase 插入
 */
async function insertWithRetry(
  table: string,
  rows: Record<string, unknown>[],
  retries = MAX_RETRIES
): Promise<{ count: number; error?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase.from(table).insert(rows);
    if (!error) return { count: rows.length };
    if (attempt < retries) {
      await sleep(2000 * attempt); // 递增等待
    } else {
      return { count: 0, error: error.message };
    }
  }
  return { count: 0 };
}

/**
 * 批量生成 embedding
 * OpenAI 的 embedding API 支持一次传入多条文本，比逐条调用快得多
 */
async function batchEmbed(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    encoding_format: "float",
  });
  // 返回的 embedding 顺序和输入顺序一致
  return response.data.map((d) => d.embedding);
}

// ============================================================
// 5. 主流程
// ============================================================
async function main() {
  console.log("=".repeat(60));
  console.log("诗词向量数据库 Seed 脚本");
  console.log("=".repeat(60));

  // --- 读取数据 ---
  const inputPath = path.join(__dirname, "poem-chunks.json");
  if (!fs.existsSync(inputPath)) {
    console.error("❌ 找不到 poem-chunks.json，请先运行: python3 scripts/process-poems.py");
    process.exit(1);
  }

  const data: InputData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  console.log(`\n📖 读取数据: ${data.poems.length} 首诗, ${data.chunks.length} 条 chunks`);

  // --- Step A: 插入 poems 表 ---
  console.log("\n📝 Step A: 插入诗词主表 (poems)...");

  // 先清空旧数据 (重新 seed 时避免重复)
  const { error: deleteChunksErr } = await supabase.from("poem_chunks").delete().gte("id", 0);
  if (deleteChunksErr) console.warn("  清空 poem_chunks 表:", deleteChunksErr.message);

  const { error: deletePoemsErr } = await supabase.from("poems").delete().gte("id", 0);
  if (deletePoemsErr) console.warn("  清空 poems 表:", deletePoemsErr.message);

  // 分批插入 poems，用数组下标 (poem_index) 做映射
  // 这样即使有同名诗 (如苏轼多首《浣溪沙》) 也不会冲突
  const poemIndexToDbId = new Map<number, number>(); // poem_index → DB id

  for (let i = 0; i < data.poems.length; i += BATCH_SIZE) {
    const batch = data.poems.slice(i, i + BATCH_SIZE);

    // 带重试的插入
    let inserted: { id: number }[] | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const result = await supabase
        .from("poems")
        .insert(batch.map((p) => ({
          title: p.title,
          author: p.author,
          dynasty: p.dynasty,
          full_content: p.full_content,
          source: p.source,
        })))
        .select("id");

      if (!result.error) {
        inserted = result.data;
        break;
      }
      if (attempt < MAX_RETRIES) {
        await sleep(2000 * attempt);
      } else {
        console.error(`\n  ❌ 批次 ${i}~${i + batch.length} 插入失败 (${MAX_RETRIES}次重试后):`, result.error.message);
      }
    }

    // 返回的 id 顺序和插入顺序一致，用数组下标映射
    for (let j = 0; j < (inserted || []).length; j++) {
      poemIndexToDbId.set(i + j, inserted![j].id);
    }

    process.stdout.write(`\r  ✅ 已插入 ${Math.min(i + BATCH_SIZE, data.poems.length)}/${data.poems.length} 首诗`);
  }
  console.log(`\n  poems 表完成: ${poemIndexToDbId.size} 条`);

  // --- Step B: 生成 embedding + 插入 poem_chunks 表 ---
  console.log("\n🧠 Step B: 生成 embedding + 插入 chunks...");
  console.log(`  共 ${data.chunks.length} 条 chunks，每 ${EMBEDDING_BATCH_SIZE} 条调用一次 OpenAI API`);

  let insertedCount = 0;
  let skippedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < data.chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const chunkBatch = data.chunks.slice(i, i + EMBEDDING_BATCH_SIZE);

    // 准备要 embed 的文本
    const textsToEmbed = chunkBatch.map((c) => c.chunk_text);

    try {
      // 批量调用 OpenAI Embedding API
      const embeddings = await batchEmbed(textsToEmbed);

      // 准备要插入 Supabase 的数据
      const rows = chunkBatch.map((chunk, idx) => {
        const poemId = poemIndexToDbId.get(chunk.poem_index);
        if (!poemId) {
          skippedCount++;
          return null;
        }
        return {
          poem_id: poemId,
          chunk_text: chunk.chunk_text,
          chunk_index: chunk.chunk_index,
          embedding: JSON.stringify(embeddings[idx]), // pgvector 接受 JSON 数组格式
        };
      }).filter(Boolean);

      // 分小批插入 Supabase (避免单次请求太大，带重试)
      for (let j = 0; j < rows.length; j += BATCH_SIZE) {
        const insertBatch = rows.slice(j, j + BATCH_SIZE);
        const result = await insertWithRetry("poem_chunks", insertBatch as Record<string, unknown>[]);
        if (result.error) {
          console.error(`\n  ❌ Supabase 插入失败 (batch ${i + j}, ${MAX_RETRIES}次重试后):`, result.error);
        } else {
          insertedCount += result.count;
        }
      }

      // 进度显示
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(i + EMBEDDING_BATCH_SIZE, data.chunks.length);
      const eta = (elapsed / progress) * (data.chunks.length - progress);
      process.stdout.write(
        `\r  🔄 进度: ${progress}/${data.chunks.length} chunks | ` +
        `已插入: ${insertedCount} | ` +
        `耗时: ${elapsed.toFixed(0)}s | ` +
        `预计剩余: ${eta.toFixed(0)}s   `
      );

      // 稍微等一下，避免 OpenAI rate limit
      await sleep(200);

    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`\n  ❌ Embedding 失败 (batch ${i}):`, errMsg);
      // 如果是 rate limit，等久一点再重试
      if (errMsg.includes("rate") || errMsg.includes("429")) {
        console.log("  ⏳ Rate limited，等待 30 秒...");
        await sleep(30000);
        i -= EMBEDDING_BATCH_SIZE; // 重试这个批次
      }
    }
  }

  // --- 完成 ---
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`🎉 Seed 完成!`);
  console.log(`  诗词: ${poemIndexToDbId.size} 首`);
  console.log(`  Chunks: ${insertedCount} 条 (跳过 ${skippedCount} 条)`);
  console.log(`  总耗时: ${totalTime} 秒`);
  console.log(`${"=".repeat(60)}`);

  // --- 验证 ---
  console.log("\n🔍 验证: 查询数据库...");
  const { count: poemCount } = await supabase
    .from("poems")
    .select("*", { count: "exact", head: true });
  const { count: chunkCount } = await supabase
    .from("poem_chunks")
    .select("*", { count: "exact", head: true });
  console.log(`  poems 表: ${poemCount} 行`);
  console.log(`  poem_chunks 表: ${chunkCount} 行`);
}

main().catch(console.error);
