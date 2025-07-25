import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const KRUTRIM_API_URL = process.env.EMBEDDING_AI_URL || "";
const KRUTRIM_API_KEY = process.env.AI_KEY || "";

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return norm === 0 ? vector : vector.map((val) => val / norm); // prevent divide-by-zero
}

export async function generateEmbedding(text: string, embeddingModel: string): Promise<number[]> {
  const response = await axios.post(
    KRUTRIM_API_URL,
    {
      model: embeddingModel || "Bhasantarit",
      input: text,
    },
    {
      headers: {
        Authorization: `Bearer ${KRUTRIM_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const embedding: number[] = response.data?.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("Embedding not found in API response");
  }

  return normalizeVector(embedding);
}
