-- ============================================================
-- 给诗词加"经典度"评分 (fame_score)
-- ============================================================
-- 在 Supabase SQL Editor 中执行此脚本
--
-- fame_score 含义:
--   3 = 最经典 (唐诗三百首、宋词三百首、诗经)
--   2 = 很有名 (大家名作 - 李白、杜甫、苏轼、王维等)
--   1 = 一般 (其他诗词)
--
-- 这个分数会在向量检索时作为加权因子:
--   最终排序分 = cosine_similarity * 0.7 + fame_score/3 * 0.3

-- Step 1: 添加 fame_score 字段 (默认值 1)
ALTER TABLE poems ADD COLUMN IF NOT EXISTS fame_score smallint DEFAULT 1;

-- Step 2: 标记经典选本 (fame_score = 3)
-- 唐诗三百首、宋词三百首、诗经、楚辞
UPDATE poems SET fame_score = 3
WHERE source IN ('唐诗三百首', '宋词三百首', '诗经', '楚辞');

-- Step 3: 标记顶级名家 (fame_score = 2，如果不是已经标3的话)
UPDATE poems SET fame_score = GREATEST(fame_score, 2)
WHERE author IN (
  -- 唐代大家
  '李白', '杜甫', '白居易', '王维', '李商隐', '杜牧', '王昌龄',
  '孟浩然', '刘禹锡', '韩愈', '柳宗元', '王之涣', '岑参', '高适',
  '温庭筠', '韦应物', '贺知章', '张九龄', '骆宾王', '陈子昂',
  -- 宋代大家
  '苏轼', '辛弃疾', '李清照', '陆游', '柳永', '晏殊', '欧阳修',
  '秦观', '周邦彦', '姜夔', '范仲淹', '王安石', '黄庭坚',
  -- 其他朝代名家
  '纳兰性德', '屈原', '曹操', '曹植', '陶渊明', '谢灵运'
);

-- Step 4: 验证分布
SELECT fame_score, COUNT(*) AS poem_count
FROM poems
GROUP BY fame_score
ORDER BY fame_score DESC;

-- Step 5: 更新搜索函数 — 加入经典度加权
CREATE OR REPLACE FUNCTION search_poem_chunks(
  query_embedding text,
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 10
)
RETURNS TABLE (
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
    pc.chunk_text,
    p.title AS poem_title,
    p.author AS poem_author,
    p.dynasty,
    p.full_content,
    p.source,
    p.fame_score,
    -- 加权公式: 70% 语义相似度 + 30% 经典度
    -- 这样经典诗词在同等语义相关度下会排在前面
    (
      (1 - (pc.embedding <=> query_embedding::vector)) * 0.7
      + (p.fame_score::float / 3.0) * 0.3
    ) AS similarity
  FROM poem_chunks pc
  JOIN poems p ON p.id = pc.poem_id
  WHERE 1 - (pc.embedding <=> query_embedding::vector) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
