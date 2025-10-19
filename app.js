const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
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
app.get("/api/orders", (req, res) => {
  res.json(readJson(ordersFile));
});

// GET orders for a specific customerID
app.get("/api/orders/customer/:customerID", (req, res) => {
  const orders = readJson(ordersFile);
  const customerID = req.params.customerID;

  // Filter orders by customerID
  const userOrders = orders.filter(order => order.customerID === customerID);

  res.json(userOrders);
});

// Add new order
app.post("/api/orders", (req, res) => {
  const orders = readJson(ordersFile);
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
  orders.push(newOrder);
  writeJson(ordersFile, orders);
  res.json(newOrder);
});

// Update order (edit details)
app.put("/api/orders/:id", (req, res) => {
  const orders = readJson(ordersFile);
  const idx = orders.findIndex(o => o.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found" });

  orders[idx] = { ...orders[idx], ...req.body };
  writeJson(ordersFile, orders);
  res.json(orders[idx]);
});

// Fill order
app.put("/api/orders/:id/fill", (req, res) => {
  const orders = readJson(ordersFile);
  const stock = readJson(stockFile);

  const order = orders.find(o => o.id == req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.orderFilled) return res.status(400).json({ error: "Already filled" });

  // ✅ match by stock ID
  const drug = stock.find(s => Number(s.id) === Number(order.drug));
  if (!drug) return res.status(400).json({ error: "Drug not found in stock" });

  if (drug.amount < order.amount) {
    return res.status(400).json({ error: "Not enough stock" });
  }

  drug.amount -= order.amount;
  order.orderFilled = true;

  writeJson(stockFile, stock);
  writeJson(ordersFile, orders);

  res.json(order);
});

// Delete order
app.delete("/api/orders/:id", (req, res) => {
  let orders = readJson(ordersFile);
  orders = orders.filter(o => o.id != req.params.id);
  writeJson(ordersFile, orders);
  res.json({ success: true });
});


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
