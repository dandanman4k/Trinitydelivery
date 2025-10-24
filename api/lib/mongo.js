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

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1"; // keep validation on
  client = new MongoClient(url, { tlsAllowInvalidCertificates: false });
  await client.connect();

  db = client.db(process.env.MONGO_DB);
  console.log("✅ Connected to MongoDB:", db.databaseName);

  return { client, db };
}
