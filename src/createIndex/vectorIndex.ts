import { MongoClient, Db, Collection, Document } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const mongoUri = process.env.MONGODB_URI || '';
const db_name = process.env.DB_NAME || '';
const collection_name = process.env.COLLECTION_NAME || '';

if (!mongoUri) {
  throw new Error("MONGO_URI environment variable is not defined.");
}

const client = new MongoClient(mongoUri);

interface SearchIndex {
  name: string;
  queryable?: boolean;
}

interface VectorField {
  type: "vector";
  numDimensions: number;
  path: string;
  similarity: string;
  quantization: string;
}

interface FilterField {
  type: "filter";
  path: string;
}

interface VectorSearchIndex {
  name: string;
  type: string;
  definition: {
    fields: (VectorField | FilterField)[];
  };
}

async function run(): Promise<void> {
  try {
    const database: Db = client.db(db_name);
    const collection: Collection<Document> = database.collection(collection_name);

    const index: VectorSearchIndex = {
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            numDimensions: 2048,
            path: "questionEmbedding",
            similarity: "cosine",
            quantization: "scalar",
          },
          {
            type: "filter",
            path: "botId",
          },
        ],
      },
    };

    const result: string = await collection.createSearchIndex(index);
    console.log(`New search index named "${result}" is building.`);

    console.log("This may take up to a minute...");
    let isQueryable = false;

    while (!isQueryable) {
      const cursor = collection.listSearchIndexes();
      for await (const idx of cursor as AsyncIterable<SearchIndex>) {
        if (idx.name === result) {
          if (idx.queryable) {
            console.log(`Search index "${result}" is ready for querying.`);
            isQueryable = true;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    }
  } catch (error) {
    console.error("An error occurred while creating the search index:", error);
  } finally {
    await client.close();
  }
}

run();
