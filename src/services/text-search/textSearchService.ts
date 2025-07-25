import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

export async function textSearchFromText(
  query: string,
  bot_id: string,
  limit: number,
  filter: Record<string, any> = {},
) {
  const client = new MongoClient(process.env.MONGODB_URI!);
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || '');
    const collection = db.collection(process.env.COLLECTION_NAME || '');

    const searchFilter: Record<string, any> = {
      $text: { $search: query },
      botId: bot_id,
      ...filter
    };

    const projection = {
      _id: 1,
      question: 1,
      answer: 1,
      botId: 1,
      timestamp: 1,
      created_at: 1,
      updated_at: 1,
      text_score: { $divide: [{ $meta: 'textScore' }, 2 ]},
    };

    const results = await collection
      .find(searchFilter, { projection })
      .sort({ text_score: { $meta: 'textScore' } })
      .limit(limit)
      .toArray();

    const finalResult = results.map(doc => ({
      ...doc,
      vector_score: 0,
      score: doc.text_score
    }));

    return finalResult;
  } finally {
    await client.close();
  }
}
