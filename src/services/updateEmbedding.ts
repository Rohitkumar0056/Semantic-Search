import { MongoClient } from "mongodb";
import { generateEmbedding } from "./generateEmbedding";
import { getBotDefinition } from "../routes/search";

import dotenv from "dotenv";
dotenv.config();

async function updateEmbeddings(bot_id: string) {
  const mongoUri = process.env.MONGODB_URI || "";
  const dbName = process.env.DB_NAME || "";
  const collectionName = process.env.COLLECTION_NAME || "";

  if (!bot_id) {
    throw new Error("Bot ID is required");
  }
  const botDef = await getBotDefinition(bot_id as string);
  if (!botDef) {
    const response = {
      success: false,
      message: "Bot definition not found",
    };
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(dbName);
  const collection = db.collection(collectionName);
  const model = botDef?.embeddingModel || "Bhasantarit";

  const cursor = collection.find({
    botId: bot_id,
    question: { $exists: true },
    questionEmbedding: { $exists: false }
  });

  let updatedCount = 0;

  for await (const doc of cursor) {
    try {
      const embedding = await generateEmbedding(doc.question, model);
      if (!Array.isArray(embedding) || embedding.length !== 2048) {
        console.warn(`Invalid embedding size for _id ${doc._id}`);
        continue;
      }

      await collection.updateOne(
        { _id: doc._id },
        { $set: { questionEmbedding: embedding } }
      );

      console.log(`Updated _id ${doc._id}`);
      updatedCount++;
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Failed for _id ${doc._id}:`, err.message);
      } else {
        console.error(`Failed for _id ${doc._id}:`, err);
      }
    }
  }

  console.log(`Finished updating ${updatedCount} documents for botId: ${bot_id}`);
  await client.close();
}

