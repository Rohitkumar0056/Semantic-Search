import { MongoClient } from "mongodb";
import { generateEmbedding } from "../generateEmbedding"
import dotenv from "dotenv";
dotenv.config();

export async function vectorSearchFromText(
  query: string,
  bot_id: string,
  limit: number,
  filter: Record<string, any> = {},
  embeddingModel: string = "Bhasantarit"
) {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const db = client.db(process.env.DB_NAME || "");
  const collection = db.collection(process.env.COLLECTION_NAME || "");

  const queryVector = await generateEmbedding(query, embeddingModel);

  const embeddedFilter = {
    $and: [
      { botId: bot_id },
      ...Object.entries(filter).map(([key, value]) => ({ [key]: value })),
    ],
  };

  const pipeline: any[] = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "questionEmbedding", 
        queryVector,
        numCandidates: 2000,
        limit: limit,
        filter: embeddedFilter
      },
    },
  ];

  if (Object.keys(filter).length > 0) {
    pipeline.push({ $match: filter });
  }

  pipeline.push({
      $project: {
        _id: 1,
        question: 1,
        answer: 1,
        botId: 1,
        vector_score: { $meta: "vectorSearchScore" },
        timestamp: 1,
        created_at: 1,
        updated_at: 1,
      },
    },
    {
    $match: {
      vector_score: { $gte: 0.90 },
    },
  },
  );

  const results = await collection.aggregate(pipeline).toArray();
  await client.close();

  const finalResult = results.map(doc => ({
    ...doc,
    text_score: 0,
    score: doc.vector_score,
  }));
  return finalResult;
}