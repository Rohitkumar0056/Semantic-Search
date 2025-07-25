import { MongoClient } from "mongodb";
import { generateEmbedding } from "../generateEmbedding"
import dotenv from "dotenv";
dotenv.config();

export async function hybridSearchFromText(
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

  const vectorWeight = 0.1;
  const textWeight = 0.9;
  const queryVector = await generateEmbedding(query, embeddingModel);

  const pipeline: any[] = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "questionEmbedding",
        queryVector,
        numCandidates: 2000,
        limit,
        filter: { botId: bot_id, ...filter },
      },
    },
    {
      $addFields: {
        vector_score: {
          $multiply: ["$score", vectorWeight],
        },
        text_score: { $literal: 0 },
      },
    },
    {
      $project: {
        _id: 1,
        question: 1,
        answer: 1,
        vector_score: 1,
        text_score: 1,
      },
    },
    {
      $unionWith: {
        coll: process.env.COLLECTION_NAME || "",
        pipeline: [
          {
            $search: {
              index: "text_index",
              text: {
                query,
                path: "question",
              },
            },
          },
          {
            $match: {
              botId: bot_id,
              ...filter,
            },
          },
          {
            $addFields: {
              text_score: {
                $multiply: [{$meta: "searchScore"}, textWeight],
              },
              vector_score: { $literal: 0 },
            },
          },
          {
            $project: {
              _id: 1,
              question: 1,
              answer: 1,
              vector_score: 1,
              text_score: 1,
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$_id",
        question: { $first: "$question" },
        answer: { $first: "$answer" },
        vector_score: { $max: "$vector_score" },
        text_score: { $max: "$text_score" },
      },
    },
    {
      $addFields: {
        score: { $add: ["$vector_score", "$text_score"] },
      },
    },
    {
      $match: {
        score: { $gte: 0.70 },
      },
    },
    {
      $sort: { score: -1 },
    },
    {
      $limit: limit,
    },
  ];

  const results = await collection.aggregate(pipeline).toArray();
  await client.close();
  // Normalize vector_score and text_score to [0, 1]
  const maxVector = Math.max(...results.map(r => typeof r.vector_score === "number" ? r.vector_score : 0), 1);
  const maxText = Math.max(...results.map(r => typeof r.text_score === "number" ? r.text_score : 0), 1);

  const normalized = results.map(r => {
    const vector_score = typeof r.vector_score === "number" ? r.vector_score / maxVector : 0;
    const text_score = typeof r.text_score === "number" ? r.text_score / maxText : 0;
    const score = vector_score + text_score;
    return {
      ...r,
      vector_score,
      text_score,
      score,
    };
  })
  //.filter(r => r.score > 0.7)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);

  return normalized;
}   