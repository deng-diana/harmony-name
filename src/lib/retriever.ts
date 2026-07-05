/**
 * 诗词检索器 (Retriever) — RAG 的 "R"
 * =====================================
 *
 * 旧版: 从 3.9MB JSON 文件中暴力搜索 130 首诗
 * 新版: 向 Supabase pgvector 发 RPC 请求，在 11,555 条诗句中用 HNSW 索引搜索
 *
 * 流程:
 *   1. 用户的五行查询 (如 "水 木 春天 润泽") → OpenAI Embedding → 1536维向量
 *   2. 向量发给 Supabase → search_poem_chunks 函数 → HNSW 索引快速找到最相似的诗句
 *   3. 返回 top-K 诗句 + 元数据 (标题、作者、朝代)
 */

import { getOpenAI } from "./openai";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { redis } from "./redis";

// ============================================================
// 类型定义
// ============================================================

/** 搜索结果: 一条诗句 + 相似度分数 + 经典度 */
export interface ScoredPoem {
  chunkId: number;      // 诗句行号 (DB 主键) —— 命名管线"按编号回填真出处"靠它
  chunkText: string;    // 诗句/联 (如 "春眠不觉晓，处处闻啼鸟。")
  title: string;        // 所属诗词标题
  author: string;       // 作者
  dynasty: string;      // 朝代
  source: string;       // 来源选本 (唐诗三百首/宋词三百首/诗经...)
  fullContent: string;  // 完整诗词内容
  fameScore: number;    // 经典度 (3=名篇, 2=名家, 1=一般)
  similarity: number;   // 加权相似度 (70%语义 + 30%经典度);按字检索时为 0
  coverage?: number;    // 按字检索: 该句命中了几个候选字
}

// ============================================================
// 核心搜索函数
// ============================================================

/**
 * 搜索最相关的诗句
 *
 * @param query - 搜索查询 (如 "象征坚韧、智慧的古典诗词意象")
 * @param topK  - 返回前几条结果 (默认 10)
 * @returns     - 按相似度排序的诗句列表
 *
 * 内部流程:
 *   query (文本)
 *     → OpenAI Embedding API → queryVector (1536维数组)
 *       → Supabase RPC (search_poem_chunks) → 数据库内用 HNSW 索引搜索
 *         → 返回最相似的诗句
 */
// 缓存: 喜用神组合有限(就那么几十种),相同 query 必得相同结果。
// 命中后省掉一次 OpenAI Embedding 调用 + 一次数据库往返 → 更快、更省。
// 生产用 Upstash KV(跨实例共享、持久);本地无 Upstash 时退回进程内 Map。
//
// CACHE_VERSION:【任何影响返回内容的变更都必须 bump】—— 不只是 ScoredPoem 形状,
// 还包括:RPC 重定义(如 008 改 fame 权重 0.3→0.2)、fame_score 重灌、DB 侧前置过滤变更。
// 否则旧权重/旧数据的条目会继续命中最长 30 天 → 缓存毒化。
//   v2=chunkId 字段;v3=字库重建;v4=008 fame 权重 0.8/0.2(本次审计补 bump)。
//   v5=010(search_lines_by_chars 加 fame floor)+ 011(search_poem_chunks 权重回 0.7/0.3);
//     010/011 于 2026-06-18 上线但未 bump(30 天缓存毒化窗口),2026-07-02 补 bump。
//   v6=2026-07-05 语料重建(词牌去重修复找回 ~55% 一线宋词; fame 作者表同步;
//     丧葬诗情感闸门)—— 旧语料的池子不得在 30 天 Redis 缓存中存活。
const CACHE_VERSION = "v6";
const poemCache = new Map<string, ScoredPoem[]>();
const POEM_CACHE_MAX = 500;

// 进程内缓存(无 Upstash 时)加 FIFO 上限 —— Map 迭代序=插入序,删最旧,防长驻进程泄漏。
function localCacheSet(key: string, val: ScoredPoem[]): void {
  if (poemCache.size >= POEM_CACHE_MAX) {
    const oldest = poemCache.keys().next().value;
    if (oldest !== undefined) poemCache.delete(oldest);
  }
  poemCache.set(key, val);
}

// redis 操作【包安全】:Upstash 瞬时故障只当 cache miss / 跳过写入,绝不连累已成功的
// DB 检索(尤其 set 是在拿到结果【之后】,裸 await 失败会毁掉一次成功请求)。
async function cacheGet(key: string): Promise<ScoredPoem[] | null> {
  if (redis) {
    try {
      return (await redis.get<ScoredPoem[]>(key)) ?? null;
    } catch (e) {
      console.warn("redis get failed (miss):", e instanceof Error ? e.message : e);
      return null;
    }
  }
  return poemCache.get(key) ?? null;
}
async function cacheSet(key: string, val: ScoredPoem[]): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, val, { ex: 60 * 60 * 24 * 30 });
    } catch (e) {
      console.warn("redis set failed (skip):", e instanceof Error ? e.message : e);
    }
  } else {
    localCacheSet(key, val);
  }
}

export async function searchPoems(
  query: string,
  topK: number = 10
): Promise<ScoredPoem[]> {
  const cacheKey = `poems:${CACHE_VERSION}:${query}:${topK}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  // Step 1: 把查询文本变成向量
  // "水 木 春天 润泽" → [0.012, -0.034, 0.056, ...] (1536个浮点数)
  // 包 try/catch:embedding 失败只让"语义检索"这一路降级返回 [],
  // 不连累并联的"按字检索"(buildVerifiedPool 用 Promise.all)。
  let queryVector: number[];
  try {
    const embeddingResponse = await getOpenAI().embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float",
    });
    queryVector = embeddingResponse.data[0].embedding;
  } catch (e) {
    console.error("Embedding 失败:", e instanceof Error ? e.message : e);
    return [];
  }

  // Step 2: 调用 Supabase RPC — 向量搜索
  //
  // 这一行等价于:
  //   SELECT chunk_text, poem_title, poem_author, dynasty, full_content,
  //          1 - (embedding <=> query_vector) AS similarity
  //   FROM poem_chunks JOIN poems ON ...
  //   WHERE similarity > 0.25
  //   ORDER BY embedding <=> query_vector
  //   LIMIT 10
  //
  // 但我们不需要手写 SQL，Supabase 的 rpc() 帮我们调用之前定义的函数
  const { data, error } = await getSupabaseAdmin().rpc("search_poem_chunks", {
    query_embedding: JSON.stringify(queryVector),
    match_threshold: 0.25,   // 相似度低于 0.25 的不要 (太不相关)
    match_count: topK,
  });

  if (error) {
    console.error("诗词检索失败:", error.message);
    return [];
  }

  // Step 3: 格式化返回结果
  // 注意:PostgREST 把 bigint 字段(chunk_id)序列化为 JS string —— `as number` 是
  // TS 层面的谎言,运行时仍是 string。必须用 Number() 强转,否则:
  //   ① buildVerifiedPool 的 `seen.has(chunkId)` 因 string vs number 不去重;
  //   ② verify.ts 的 `ctx.pool.find(p => p.chunkId === c.lineId)` 严格 === 直接 miss,
  //      整组 semantic-arm 候选被判"lineId 不在候选池"全军覆没。
  const results: ScoredPoem[] = (data || []).map((row: Record<string, unknown>) => ({
    chunkId: Number(row.chunk_id),
    chunkText: row.chunk_text as string,
    title: row.poem_title as string,
    author: row.poem_author as string,
    dynasty: row.dynasty as string,
    source: row.source as string,
    fullContent: row.full_content as string,
    fameScore: row.fame_score as number,
    similarity: row.similarity as number,
  }));

  // 只缓存成功结果(出错时上面已 return [],不会污染缓存)
  await cacheSet(cacheKey, results);
  return results;
}

// ============================================================
// 命名管线 v2 —— 按"候选字"检索真实诗句 + 合并候选池
// ============================================================

// 单条诗句(chunk)允许的最大长度。超过即视为"散文整段"(如楚辞《卜居》《渔父》
// 未被正确切分的长 chunk),名字应从"一联"里取字,故过滤掉。
const MAX_POOL_LINE_LEN = 34;

/**
 * Funerary / mourning poem title blacklist — deterministic sentiment gate.
 *
 * Traditional Chinese naming practice treats inauspicious source texts as
 * disqualifying: naming a child from a dirge, lamentation, or death poem
 * is 大忌 regardless of how bright a single line looks in isolation.
 * The Critic is structurally blind to this because it only receives the
 * bare line text (no title/poem context), so this must be a hard code gate.
 *
 * Coverage:
 *   - Specific 楚辞 funerary texts: 招魂/大招 (soul-summoning for the dead),
 *     国殇 (dirge for war dead), 哀郢/怀沙/悲回风/惜往日 (屈原's exile/death laments;
 *     怀沙 is traditionally his suicide poem), 哀时命 (庄忌), 九思 Han imitations.
 *   - Pattern-matched titles containing: 哀/悲/悼/挽/殇/哭/葬/招魂/墓/祭/伤/哭
 *     (catches mourning poems across all dynasties).
 *
 * Note: 楚辞 virtue passages (离骚/九歌/橘颂) are NOT blocked — only the
 * funerary sub-corpus. The 男楚辞 naming convention draws specifically from
 * those virtue sections, not from the lament corpus.
 *
 * Source: poetry expert audit 2026-07-05 (result.guoxue.poetry.findings[1]).
 */
const FUNERARY_POEM_TITLES = new Set<string>([
  // 楚辞 specific funerary texts
  "招魂", "大招", "国殇", "哀郢", "怀沙", "悲回风", "惜往日",
  "哀时命", "九思", "伤时", "哀岁", "逢尤", "悯上", "悼乱",
  "七谏", "九怀", "九叹",
  // Other well-known mourning / dirge titles
  "祭妹文", "祭十二郎文", "吊古战场文",
]);

/** Pattern-based check for mourning/funerary poem titles. */
const FUNERARY_TITLE_PATTERN = /哀|悲|悼|挽|殇|哭|葬|招魂|墓|祭文|伤逝/;

/**
 * Returns true if the poem title indicates a funerary or mourning work that
 * must not be used as a naming source — regardless of individual line content.
 */
export function isFuneraryPoemTitle(title: string): boolean {
  if (FUNERARY_POEM_TITLES.has(title)) return true;
  if (FUNERARY_TITLE_PATTERN.test(title)) return true;
  return false;
}

/**
 * 按候选字检索:返回真实含【任一】候选字的名句(coverage 越高、越经典越靠前)。
 * 调 006 迁移建的 RPC `search_lines_by_chars`。结果同样缓存(候选字组合有限)。
 */
export async function searchLinesByChars(
  chars: string[],
  topK: number = 20
): Promise<ScoredPoem[]> {
  const uniq = [...new Set(chars.filter(Boolean))];
  if (uniq.length === 0) return [];

  const cacheKey = `lines:${CACHE_VERSION}:${[...uniq].sort().join("")}:${topK}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const { data, error } = await getSupabaseAdmin().rpc("search_lines_by_chars", {
    chars: uniq,
    match_count: topK,
  });
  if (error) {
    console.error("按字检索失败:", error.message);
    return [];
  }

  const results: ScoredPoem[] = (data || []).map(
    (row: Record<string, unknown>) => ({
      chunkId: Number(row.chunk_id),
      chunkText: row.chunk_text as string,
      title: row.poem_title as string,
      author: row.poem_author as string,
      dynasty: row.dynasty as string,
      source: row.source as string,
      fullContent: row.full_content as string,
      fameScore: row.fame_score as number,
      similarity: 0,
      coverage: row.coverage as number,
    })
  );

  await cacheSet(cacheKey, results);
  return results;
}

/**
 * 合并候选池:并联两路检索 →
 *   (a) 按字检索:真实含喜用神候选字的名句(保证"字在真句里")
 *   (b) 语义检索:意象相关的名句(丰富意境)
 * 按 chunkId 去重、过滤超长散文 chunk、截断到 cap 条。
 * 这是取名先生【唯一】可引用的诗句宇宙 —— 出处只能从这里来。
 */
export async function buildVerifiedPool(opts: {
  favourableChars: string[]; // 来自字库的喜用神候选字
  imageryQuery: string; // 语义检索用的意象词串
  perArm?: number;
  cap?: number;
}): Promise<ScoredPoem[]> {
  const perArm = opts.perArm ?? 26; // 略高于 cap:补偿下方"每作者≤4/每诗≤2"配额的损耗,使池仍能填向 cap
  const cap = opts.cap ?? 30;

  const [byChars, bySem] = await Promise.all([
    opts.favourableChars.length
      ? searchLinesByChars(opts.favourableChars, perArm)
      : Promise.resolve([] as ScoredPoem[]),
    searchPoems(opts.imageryQuery, perArm),
  ]);

  // 组装顺序(P1.5 意象优先):
  //   ① byChars 里 coverage>=2 的【双字命中】句优先 —— 既接地、又更可能含成词片段。
  //   ② 其余按 [语义(意象) ⇄ byChars 单字命中] 交替填充,确保"有意境的整句"不被
  //      "恰好含某喜用字"的句子挤出候选池 —— 这正是"借字而非承境→名字不自然"的结构根因。
  const byHi = byChars.filter((p) => (p.coverage ?? 0) >= 2);
  const byLo = byChars.filter((p) => (p.coverage ?? 0) < 2);
  const interleaved: ScoredPoem[] = [];
  for (let i = 0; i < Math.max(bySem.length, byLo.length); i++) {
    if (i < bySem.length) interleaved.push(bySem[i]);
    if (i < byLo.length) interleaved.push(byLo[i]);
  }

  // 多样性配额(防"王维同质化"):同一首诗最多 2 句、同一作者最多 4 句进池 ——
  // 否则王维《山居秋暝》一首就能霸占大半个池子,导致不同命主反复拿到同一组名字。
  const PER_POEM = 2;
  const PER_AUTHOR = 4;
  const seen = new Set<number>();
  const poemCount = new Map<string, number>();
  const authorCount = new Map<string, number>();
  const pool: ScoredPoem[] = [];
  for (const p of [...byHi, ...interleaved]) {
    if (p.chunkId == null || seen.has(p.chunkId)) continue;
    const text = p.chunkText || "";
    if (text.length === 0 || text.length > MAX_POOL_LINE_LEN) continue; // 滤掉散文长段
    // Sentiment gate: funerary/mourning poems must not be naming sources.
    // Traditional practice (大忌) disqualifies dirges, laments, and soul-summoning
    // texts outright — regardless of how bright an individual line may look.
    if (isFuneraryPoemTitle(p.title)) continue;
    const pk = `${p.author}《${p.title}》`;
    if ((poemCount.get(pk) ?? 0) >= PER_POEM) continue;
    if ((authorCount.get(p.author) ?? 0) >= PER_AUTHOR) continue;
    seen.add(p.chunkId);
    poemCount.set(pk, (poemCount.get(pk) ?? 0) + 1);
    authorCount.set(p.author, (authorCount.get(p.author) ?? 0) + 1);
    pool.push(p);
    if (pool.length >= cap) break;
  }
  return pool;
}
