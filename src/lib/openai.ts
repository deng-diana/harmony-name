import OpenAI from "openai";

// Shared OpenAI client singleton — reused across all API routes and retriever
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
