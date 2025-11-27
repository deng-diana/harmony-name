import OpenAI from "openai";
import similarity from "compute-cosine-similarity";
// @ts-ignore
import poemsDb from "./poems-db.json"; 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ScoredPoem {
  title: string;
  author: string;
  content: string;
  dynasty: string;
  score: number;
}

export async function searchPoems(query: string, topK: number = 5): Promise<ScoredPoem[]> {
  console.log(`🔍 RAG Searching: "${query}" in ${poemsDb.length} poems...`);

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    encoding_format: "float",
  });
  
  const queryEmbedding = response.data[0].embedding;

  const scoredPoems = poemsDb.map((poem: any) => {
    const score = similarity(queryEmbedding, poem.embedding);
    return {
      title: poem.title,
      author: poem.author,
      dynasty: poem.dynasty,
      content: poem.content,
      score: score || 0,
    };
  });

  // 排序并取前 K 个 (我们取 5 个，给 AI 更多选择)
  scoredPoems.sort((a: any, b: any) => b.score - a.score);
  
  const topPoems = scoredPoems.slice(0, topK);
  
  console.log(`📚 Found ${topPoems.length} matches. Top: 《${topPoems[0].title}》`);
  
  return topPoems;
}