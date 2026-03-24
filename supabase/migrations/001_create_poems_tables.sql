-- ============================================================
-- Harmony Name - Poetry Vector Database Schema
-- ============================================================
-- 这个 migration 做三件事:
-- 1. 启用 pgvector 扩展 (向量搜索能力)
-- 2. 创建 poems 表 (存整首诗的元数据)
-- 3. 创建 poem_chunks 表 (存按联/句切分后的文本 + 向量)
-- 4. 创建相似度搜索函数
-- ============================================================

-- Step 1: 启用 pgvector 扩展
-- pgvector 让 PostgreSQL 具备了向量存储和相似度搜索能力
-- 这一行就是 Supabase 变成"向量数据库"的关键
create extension if not exists vector with schema extensions;

-- Step 2: 创建诗词主表 (存完整的诗)
create table poems (
  id          bigserial primary key,
  title       text not null,                    -- 诗词标题
  author      text not null,                    -- 作者
  dynasty     text not null,                    -- 朝代: 唐/宋/先秦/战国
  full_content text not null,                   -- 完整诗词内容
  source      text not null,                    -- 数据来源: 唐诗三百首/宋词三百首/诗经/楚辞/名家
  created_at  timestamptz default now()
);

-- Step 3: 创建诗词分块表 (核心! 这是 RAG 检索的单位)
--
-- 为什么要分块?
-- 整首诗做 embedding → 语义太分散，检索不准
-- 按联/句做 embedding → 语义聚焦，"春风又绿江南岸"能精确匹配到"春""绿"意象
--
-- text-embedding-3-small 输出 1536 维向量
create table poem_chunks (
  id          bigserial primary key,
  poem_id     bigint references poems(id) on delete cascade,
  chunk_text  text not null,                    -- 一联/一句的文本
  chunk_index smallint not null,                -- 在原诗中的位置 (第几联)
  embedding   vector(1536),                     -- 向量! 这就是语义的"GPS坐标"
  created_at  timestamptz default now()
);

-- Step 4: 创建 HNSW 索引 (让向量搜索变快)
--
-- 没有索引 → 暴力搜索，逐条比较 (O(n))
-- HNSW 索引 → 近似最近邻搜索 (O(log n))
--
-- vector_cosine_ops = 用余弦相似度衡量向量距离
-- 这是文本语义搜索最常用的距离度量
create index idx_poem_chunks_embedding
  on poem_chunks
  using hnsw (embedding vector_cosine_ops);

-- 给 poem_id 加索引，方便 JOIN 查询
create index idx_poem_chunks_poem_id
  on poem_chunks(poem_id);

-- Step 5: 创建相似度搜索函数 (给应用层调用的接口)
--
-- 这个函数封装了向量搜索逻辑:
-- 输入: 一个 query 向量 + 相似度阈值 + 返回数量
-- 输出: 最相似的诗句 + 对应的诗词元信息 + 相似度分数
create or replace function search_poem_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count int default 10
)
returns table (
  chunk_id    bigint,
  chunk_text  text,
  poem_title  text,
  poem_author text,
  dynasty     text,
  full_content text,
  similarity  float
)
language plpgsql
as $$
begin
  return query
  select
    pc.id as chunk_id,
    pc.chunk_text,
    p.title as poem_title,
    p.author as poem_author,
    p.dynasty,
    p.full_content,
    1 - (pc.embedding <=> query_embedding) as similarity
  from poem_chunks pc
  join poems p on p.id = pc.poem_id
  where 1 - (pc.embedding <=> query_embedding) > match_threshold
  order by pc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================================
-- 使用示例 (在你的 TypeScript 代码中):
--
-- // 1. 先把用户查询转成向量
-- const embedding = await openai.embeddings.create({...})
--
-- // 2. 调用这个函数搜索
-- const { data } = await supabase.rpc('search_poem_chunks', {
--   query_embedding: embedding,
--   match_threshold: 0.3,
--   match_count: 10
-- })
--
-- // 3. data 就是最相关的诗句列表!
-- ============================================================
