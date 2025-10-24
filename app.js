// app.js
import express from "express";
import path from "path";
import fs from "fs";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { connectToDatabase } from "./api/lib/mongo.js";

dotenv.config();

const app = express();

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "Pages")));

// --- Utility JSON readers (for local testing only) ---
const dataFile = path.join(__dirname, "data", "stock.json");
const readData = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));
const writeData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

// --- Stock Routes ---
app.get("/api/items", (req, res) => {
  res.json(readData());
});

app.post("/api/items", (req, res) => {
  const items = readData();
  const newItem = {
    id: Date.now(),
    name: req.body.name,
    amount: req.body.amount || 0,
    price: req.body.price || 0,
    catagory: req.body.catagory,
    image: req.body.image,
    description: req.body.description,
  };
  items.push(newItem);
  writeData(items);
  res.json(newItem);
});

app.put("/api/items/:id", (req, res) => {
  const items = readData();
  const itemIndex = items.findIndex((i) => i.id == req.params.id);
  if (itemIndex === -1) return res.status(404).json({ error: "Item not found" });

  items[itemIndex] = { ...items[itemIndex], ...req.body };
  writeData(items);
  res.json(items[itemIndex]);
});

app.delete("/api/items/:id", (req, res) => {
  let items = readData();
  items = items.filter((i) => i.id != req.params.id);
  writeData(items);
  res.json({ success: true });
});

// --- MongoDB Orders API ---
app.get("/api/orders", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const orders = db.collection("orders");
    const { customerID } = req.query;
    const result = customerID
      ? await orders.find({ customerID }).toArray()
      : await orders.find().toArray();
    res.json(result);

  } catch (err) {
    console.error("❌ GET /orders failed:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const orders = db.collection("orders");
    const newOrder = {
      id: Date.now(),
      ...req.body,
      orderFilled: false,
    };
    await orders.insertOne(newOrder);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error("❌ POST /orders failed:", err);
    res.status(500).json({ error: "Failed to add order" });
  }
});

app.put("/api/orders/:id/fill", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const orders = db.collection("orders");
    const stock = db.collection("stock");

    const order = await orders.findOne({ id: Number(req.params.id) });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.orderFilled) return res.status(400).json({ error: "Already filled" });

    const drug = await stock.findOne({ id: Number(order.drug) });
    if (!drug) return res.status(400).json({ error: "Drug not found" });
    if (drug.amount < order.amount)
      return res.status(400).json({ error: "Not enough stock" });

    await stock.updateOne({ id: Number(order.drug) }, { $inc: { amount: -order.amount } });
    await orders.updateOne({ id: Number(req.params.id) }, { $set: { orderFilled: true } });

    res.json({ ...order, orderFilled: true });
  } catch (err) {
    console.error("❌ PUT /orders/:id/fill failed:", err);
    res.status(500).json({ error: "Failed to fill order" });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const orders = db.collection("orders");
    await orders.deleteOne({ id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /orders/:id failed:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// --- Pages ---
app.get("/Stock", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});
app.get("/Order", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "orders.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));


export default app;
