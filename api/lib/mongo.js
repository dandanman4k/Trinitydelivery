import { MongoClient } from "mongodb";

let client;
let db;

export async function connectToDatabase() {
  if (db) return { client, db };

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db(process.env.MONGO_DB);

  return { client, db };
}
