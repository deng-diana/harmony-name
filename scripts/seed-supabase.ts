/**
 * Poetry vector database seed script
 * ===================================
 * Reads the output of process-poems.py → generates embeddings → writes to Supabase.
 *
 * !!! DESTRUCTIVE !!!
 * This script WIPES the poems + poem_chunks tables of the target database
 * (whatever .env.local points at) before re-inserting. All fame_score /
 * enrichment / cleanup data on those tables is LOST. Take a backup first:
 *   npm run backup:corpus
 *
 * Usage:
 *   npx tsx scripts/seed-supabase.ts               # aborts: refuses to wipe without --force
 *   npx tsx scripts/seed-supabase.ts --force       # prompts for "yes" on stdin before wiping
 *   npx tsx scripts/seed-supabase.ts --force --yes # non-interactive (CI): wipe without prompting
 *
 * Prerequisites:
 *   1. Run python3 scripts/process-poems.py first (produces poem-chunks.json)
 *   2. .env.local defines OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import readline from "readline";
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
// 2b. fame_score scoring (ported from scripts/add-fame-score.sql)
// ============================================================
// The poems INSERT used to omit fame_score, so every reseed reset it to the
// column DEFAULT of 1 — silently emptying the by-chars retrieval arm, which
// requires fame_score >= 2 (migration 010). We compute the score AT INSERT TIME
// here from the same source/author lists add-fame-score.sql uses, so a reseeded
// corpus is correct without needing the SQL editor step afterwards.
//   3 = canonical anthology (唐诗三百首 / 宋词三百首 / 诗经 / 楚辞)
//   2 = famous author (masters below), if not already 3
//   1 = everything else (the column DEFAULT)
const FAME3_SOURCES = new Set(["唐诗三百首", "宋词三百首", "诗经", "楚辞"]);
const FAME2_AUTHORS = new Set([
  // Tang masters
  "李白", "杜甫", "白居易", "王维", "李商隐", "杜牧", "王昌龄",
  "孟浩然", "刘禹锡", "韩愈", "柳宗元", "王之涣", "岑参", "高适",
  "温庭筠", "韦应物", "贺知章", "张九龄", "骆宾王", "陈子昂",
  // Song masters
  "苏轼", "辛弃疾", "李清照", "陆游", "柳永", "晏殊", "欧阳修",
  "秦观", "周邦彦", "姜夔", "范仲淹", "王安石", "黄庭坚",
  // Synced with the corpus Tier-1 lists (expert audit 2026-07-05: these were
  // loaded into the corpus but excluded by the fame floor, wasting the poems)
  "吴文英", "晏几道", "贺铸", "张先",
  "王勃", "卢照邻", "张若虚", "李贺", "杜审言", "宋之问",
  // Other dynasties
  "纳兰性德", "屈原", "曹操", "曹植", "陶渊明", "谢灵运",
]);

function computeFameScore(p: PoemData): number {
  let score = 1;
  if (FAME3_SOURCES.has(p.source)) score = 3;
  if (FAME2_AUTHORS.has(p.author)) score = Math.max(score, 2);
  return score;
}

// ============================================================
// 2c. Destructive-run guard (argv + stdin confirmation)
// ============================================================
const FORCE = process.argv.includes("--force");
const ASSUME_YES = process.argv.includes("--yes");

/** Prompt on stdin and resolve true only if the user types exactly "yes". */
function confirmOnStdin(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

/**
 * Guard the WIPE. Refuses unless --force, then requires either --yes
 * (non-interactive) or the operator typing "yes" on stdin. Prints the target
 * host (never the key) so a wrong-database wipe is caught before it happens.
 */
async function confirmDestructiveWipe() {
  const host = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    } catch {
      return "(unparseable NEXT_PUBLIC_SUPABASE_URL)";
    }
  })();

  console.log("\n" + "!".repeat(60));
  console.log("!! DESTRUCTIVE OPERATION — READ CAREFULLY");
  console.log("!".repeat(60));
  console.log(`  Target Supabase host: ${host}`);
  console.log("  This will DELETE every row in `poems` and `poem_chunks` on the");
  console.log("  target database above, then re-insert from poem-chunks.json.");
  console.log("  fame_score is re-derived here, but any manual enrichment / cleanup");
  console.log("  (enrich-corpus, cleanup-corpus edits) NOT present in the JSON is LOST.");
  console.log("  Make sure you have a fresh backup: npm run backup:corpus");
  console.log("!".repeat(60));

  if (!FORCE) {
    console.error(
      "\n❌ Refusing to wipe the corpus without --force.\n" +
        "   Re-run with --force (interactive) or --force --yes (non-interactive) once\n" +
        "   you have a backup and have confirmed the target host above is correct."
    );
    process.exit(1);
  }

  if (ASSUME_YES) {
    console.log("\n--yes supplied → proceeding with wipe without interactive prompt.");
    return;
  }

  const ok = await confirmOnStdin(`\nType "yes" to WIPE the corpus on ${host}: `);
  if (!ok) {
    console.error("\n❌ Aborted — you did not type \"yes\". Corpus left untouched.");
    process.exit(1);
  }
}

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

  // Counts any embedding / insert / delete error mid-run. If > 0 at the end we
  // skip the success celebration and exit non-zero so the operator knows the
  // corpus may be partial and must be restored from backup.
  let errorCount = 0;

  // --- Step A: 插入 poems 表 ---
  console.log("\n📝 Step A: 插入诗词主表 (poems)...");

  // Guard the wipe: refuse without --force, require "yes"/--yes, print target host.
  await confirmDestructiveWipe();

  // 先清空旧数据 (重新 seed 时避免重复)
  const { error: deleteChunksErr } = await supabase.from("poem_chunks").delete().gte("id", 0);
  if (deleteChunksErr) {
    console.error("  ❌ 清空 poem_chunks 表:", deleteChunksErr.message);
    errorCount++;
  }

  const { error: deletePoemsErr } = await supabase.from("poems").delete().gte("id", 0);
  if (deletePoemsErr) {
    console.error("  ❌ 清空 poems 表:", deletePoemsErr.message);
    errorCount++;
  }

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
          // Derived at insert time so a reseed keeps the by-chars arm alive
          // (migration 010 needs fame_score >= 2). See computeFameScore above.
          fame_score: computeFameScore(p),
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
        errorCount++;
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
          errorCount++;
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
      } else {
        // Non-retryable embedding failure: this batch of chunks is dropped.
        // Count it so the final status reflects a partial corpus.
        errorCount++;
      }
    }
  }

  // --- 完成 ---
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);

  if (errorCount > 0) {
    // Do NOT celebrate on a partial run. The DB was wiped up front, so a mid-run
    // failure means the corpus is now incomplete.
    console.error(`\n\n${"=".repeat(60)}`);
    console.error(`❌ Seed FAILED with ${errorCount} error(s).`);
    console.error(`  Poems inserted: ${poemIndexToDbId.size}`);
    console.error(`  Chunks inserted: ${insertedCount} (skipped ${skippedCount})`);
    console.error(`  Elapsed: ${totalTime}s`);
    console.error(`  CORPUS MAY BE PARTIAL — restore from backup (npm run backup:corpus`);
    console.error(`  produces the .json.gz snapshots) before serving traffic.`);
    console.error(`${"=".repeat(60)}`);
    process.exit(1);
  }

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

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
