import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || '';
const db_name = process.env.DB_NAME || '';
const collection_name = process.env.COLLECTION_NAME || '';
const client = new MongoClient(uri);


async function createTextIndex() {
    try {
        await client.connect();
        const db = client.db(db_name);
        const collection = db.collection(collection_name);
        await collection.createIndex({ question: "text" }, { name: "text_index" });
        console.log('Text index created on question field');
    } finally {
        await client.close();
    }
}

createTextIndex();