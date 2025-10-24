import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();


const url = process.env.MONGO_URL;
const options = {};

let client;
let db;

export async function connectToDatabase() {
  if (db) return { client, db }; // ✅ reuse connection

  if (!url) {
    throw new Error("❌ MONGO_URL not set in environment");
  }

  client = new MongoClient(url, options);
  await client.connect();

  db = client.db(process.env.MONGO_DB);
  console.log("✅ Connected to MongoDB:", db.databaseName);

  return { client, db };
}
