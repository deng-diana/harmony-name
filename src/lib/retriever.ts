import similarity from "compute-cosine-similarity";
import { openai } from "./openai";

// poems-db.json is loaded at module init (~3.9MB with embeddings)
// TODO: consider moving to a lightweight DB for production
import poemsDb from "./poems-db.json";

interface PoemRecord {
  title: string;
  author: string;
  dynasty: string;
  content: string;
  embedding: number[];
}

export interface ScoredPoem {
  title: string;
  author: string;
  content: string;
  dynasty: string;
  score: number;
}

// Simple in-memory cache for query embeddings
// Key: query string, Value: embedding vector
const embeddingCache = new Map<string, number[]>();

export async function searchPoems(
  query: string,
  topK: number = 5
): Promise<ScoredPoem[]> {
  let queryEmbedding = embeddingCache.get(query);

  if (!queryEmbedding) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
      encoding_format: "float",
    });
    queryEmbedding = response.data[0].embedding;
    embeddingCache.set(query, queryEmbedding);
  }

  const scoredPoems = (poemsDb as PoemRecord[]).map((poem) => {
    const score = similarity(queryEmbedding!, poem.embedding);
    return {
      title: poem.title,
      author: poem.author,
      dynasty: poem.dynasty,
      content: poem.content,
      score: score || 0,
    };
  });

  scoredPoems.sort((a, b) => b.score - a.score);

  return scoredPoems.slice(0, topK);
}
