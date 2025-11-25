import OpenAI from "openai";
import similarity from "compute-cosine-similarity";
// 👇 直接导入刚才生成的数据库 (Next.js 会把它打包进去)
import poemsDb from "./poems-db.json"; 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 定义我们需要的返回格式
export interface ScoredPoem {
  title: string;
  author: string;
  content: string;
  dynasty: string;
  score: number; // 相似度分数 (越接近 1 越匹配)
}

export async function searchPoems(query: string, topK: number = 3): Promise<ScoredPoem[]> {
  console.log(`🔍 Searching for poems matching: "${query}"...`);

  // 1. 把用户的需求 (Query) 也变成向量
  // 比如用户缺 "Fire", 我们要把 "Fire" 变成 [0.1, 0.9...]
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    encoding_format: "float",
  });
  
  const queryEmbedding = response.data[0].embedding;

  // 2. 数学计算：计算 Query 和每一首诗的“余弦相似度” (Cosine Similarity)
  const scoredPoems = poemsDb.map((poem) => {
    // @ts-ignore: 忽略类型检查，确保能跑
    const score = similarity(queryEmbedding, poem.embedding);
    return {
      title: poem.title,
      author: poem.author,
      dynasty: poem.dynasty,
      content: poem.content,
      score: score || 0,
    };
  });

  // 3. 排序：分数高的排前面，取前 K 个
  scoredPoems.sort((a, b) => b.score - a.score);
  
  const topPoems = scoredPoems.slice(0, topK);
  
  console.log("📚 Found top poems:", topPoems.map(p => p.title).join(", "));
  
  return topPoems;
}