const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
import { connectToDatabase } from "./api/lib/mongo.js";
require('dotenv').config();
const fs = require("fs");

const dataFile = path.join(__dirname, "data", "stock.json");
const orderData = path.join(__dirname, "data", "orders.json");

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "Pages")));

// Utility: read/write JSON
const readData = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));
const writeData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error("❌ Error reading file:", file, err);
    return [];
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error writing file:", file, err);
  }
}

// Get all items
app.get("/api/items", (req, res) => {
  res.json(readData());
});

// Add new item
app.post("/api/items", (req, res) => {
  const items = readData();
  const newItem = {
    id: Date.now(),
    name: req.body.name,
    amount: req.body.amount || 0,
    price: req.body.price || 0,
    catagory: req.body.catagory,
    image: req.body.image,
    description: req.body.description
  };
  items.push(newItem);
  writeData(items);
  res.json(newItem);
});

// Update item
app.put("/api/items/:id", (req, res) => {
  const items = readData();
  const itemIndex = items.findIndex((i) => i.id == req.params.id);

  if (itemIndex === -1) return res.status(404).json({ error: "Item not found" });

  items[itemIndex] = {
    ...items[itemIndex],
    name: req.body.name,
    amount: req.body.amount,
    price: req.body.price,
    catagory: req.body.catagory,
    image: req.body.image,
    description: req.body.description
  };

  writeData(items);
  res.json(items[itemIndex]);
});

// Delete item
app.delete("/api/items/:id", (req, res) => {
  let items = readData();
  items = items.filter((i) => i.id != req.params.id);
  writeData(items);
  res.json({ success: true });
});

// --- Orders Routes ---
const ordersFile = path.join(__dirname, "data", "orders.json");
const stockFile = path.join(__dirname, "data", "stock.json");

// Get all orders
const orders = db.collection("orders");


export default async function handler(req, res) {
  console.log("Connecting to MongoDB...");
  const { db } = await connectToDatabase();
  console.log("Connected to:", db.databaseName);

  const orders = db.collection("orders");
  const stock = db.collection("stock");

  if (req.method === "GET") {
    // GET /api/orders or /api/orders?customerID=123
    const { customerID } = req.query;
    let result;
    if (customerID) {
      result = await orders.find({ customerID }).toArray();
    } else {
      result = await orders.find().toArray();
    }
    return res.json(result);
  }

  if (req.method === "POST") {
    const newOrder = {
      id: Date.now(),
      customerName: req.body.customerName,
      drug: req.body.drug,
      amount: req.body.amount,
      location: req.body.location,
      phoneNumber: req.body.phoneNumber,
      orderFilled: false,
      customerID: req.body.customerID,
    };
    await orders.insertOne(newOrder);
    return res.status(201).json(newOrder);
  }

  if (req.method === "PUT") {
    const { id, fill } = req.query; // /api/orders?id=123&fill=true
    if (!id) return res.status(400).json({ error: "Missing ID" });

    const order = await orders.findOne({ id: Number(id) });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (fill) {
      const drug = await stock.findOne({ id: Number(order.drug) });
      if (!drug) return res.status(400).json({ error: "Drug not found" });
      if (drug.amount < order.amount)
        return res.status(400).json({ error: "Not enough stock" });

      await stock.updateOne({ id: Number(order.drug) }, { $inc: { amount: -order.amount } });
      await orders.updateOne({ id: Number(id) }, { $set: { orderFilled: true } });
      return res.json({ ...order, orderFilled: true });
    } else {
      await orders.updateOne({ id: Number(id) }, { $set: req.body });
      const updated = await orders.findOne({ id: Number(id) });
      return res.json(updated);
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    await orders.deleteOne({ id: Number(id) });
    return res.json({ success: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}


app.get("/Stock", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});

app.get("/Order", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "orders.html"));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});

module.exports = app;
