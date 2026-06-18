-- ============================================================
-- 011: 语义检索再抬经典度权重 (0.8/0.2 → 0.7/0.3)
-- ============================================================
-- 背景:
--   search_poem_chunks 排序分 = 语义相似度*w1 + 经典度(fame/3)*w2。
--   008 把它从 0.7/0.3 调到了 0.8/0.2,让"意象匹配"更主导。但实测发现:fame=1 的
--   冷门篇只要语义沾边就能挤上来(邓朝霞/邓虹霓 出自 庄忌《哀时命》即此类)。
--   把 fame 权重回调到 0.3、语义到 0.7,让经典篇在意象相近时稳居前列。
--   这是【软】偏好(非硬下限,不砍召回),与 010 的按字硬下限互补。
--
--   除权重外,函数体与 008(005 的 text 签名 / 返回 chunk_id 版)完全一致。
--   签名不变,仍 DROP 再建以防类型缓存。
--
-- 执行: 复制到 Supabase SQL Editor → Run (008/010 之后;本文件取代 008 的权重)
-- ============================================================

DROP FUNCTION IF EXISTS search_poem_chunks(text, float, int);

CREATE FUNCTION search_poem_chunks(
  query_embedding text,
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  chunk_id bigint,
  chunk_text text,
  poem_title text,
  poem_author text,
  dynasty text,
  full_content text,
  source text,
  fame_score smallint,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id AS chunk_id,
    pc.chunk_text,
    p.title AS poem_title,
    p.author AS poem_author,
    p.dynasty,
    p.full_content,
    p.source,
    p.fame_score,
    (
      (1 - (pc.embedding <=> query_embedding::vector)) * 0.7   -- ★ 011: 语义 0.8→0.7
      + (p.fame_score::float / 3.0) * 0.3                      -- ★ 011: 经典度 0.2→0.3
    ) AS similarity
  FROM poem_chunks pc
  JOIN poems p ON p.id = pc.poem_id
  WHERE 1 - (pc.embedding <=> query_embedding::vector) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
