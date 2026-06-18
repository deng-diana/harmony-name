-- ============================================================
-- 010: 给"按字检索"加经典度下限 (fame_score >= 2) —— 堵住冷门出处
-- ============================================================
-- 背景:
--   search_lines_by_chars(006) 只要某句【含】候选字就返回,完全无视 fame_score
--   (fame 仅作并列时的次级排序)。结果:冷门诗人冷门篇(如 庄忌《哀时命》战国、
--   刘眘虚《阙题》)只要含一个常见喜用字(清/青/霞…)就灌进候选池,取名先生从中选字,
--   于是名字的"出处"全是生僻篇,不是李白/杜甫/王维/苏轼/诗经/楚辞这类经典。
--
--   修复:加 `AND p.fame_score >= 2` —— 只保留【经典源(3)】与【名家(2)】的句子。
--   fame=1 的海量冷门篇被挡在按字检索之外;语义检索(011)仍无硬下限、保留召回,
--   两路合流后池子既"含喜用字"又"出处经典"。函数体其余与 006 完全一致。
--
--   注:对喜用字极冷僻的命盘,按字检索可能返回偏少 —— 由语义路 + 编排层的"拓宽"
--   兜底,always-3 不受影响。
--
-- 执行: 复制到 Supabase SQL Editor → Run (006 之后)
-- ============================================================

CREATE OR REPLACE FUNCTION search_lines_by_chars(
  chars text[],
  match_count int DEFAULT 20
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
  coverage int
)
LANGUAGE sql
STABLE
AS $$
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
      SELECT count(*)::int
      FROM unnest(chars) AS c
      WHERE pc.chunk_text LIKE '%' || c || '%'
    ) AS coverage
  FROM poem_chunks pc
  JOIN poems p ON p.id = pc.poem_id
  WHERE p.fame_score >= 2          -- ★ 010: 经典度下限,挡掉冷门篇
    AND EXISTS (
      SELECT 1 FROM unnest(chars) AS c
      WHERE pc.chunk_text LIKE '%' || c || '%'
    )
  ORDER BY coverage DESC, p.fame_score DESC
  LIMIT match_count;
$$;

-- 验证:含 清/青/霞 的名句,应只剩经典出处(fame>=2)
-- SELECT chunk_id, coverage, fame_score, poem_author, chunk_text
-- FROM search_lines_by_chars(ARRAY['清','青','霞'], 10);
