// app.js
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { connectToDatabase } from "./api/lib/mongo.js";

dotenv.config();

const app = express();

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your-secret-key", // replace with something long/random
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set secure: true if using HTTPS
  })
);

// Serve the login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "login.html"));
});

// Handle login POST request
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const { db } = await connectToDatabase();
  
  const user = await db.collection("users").findOne({ username });
  
  if (!user) return res.send("❌ Invalid username or password");
  
  const match = await bcrypt.compare(password, user.password);
  console.log(match);
  if (!match) return res.send("❌ Invalid username or password");

  req.session.user = { username: user.username };
  res.redirect("/Stock");
});


// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});


// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "Pages")));

// Read data from MongoDB
async function readData() {
  try{
    const { db } = await connectToDatabase();
    const stock = db.collection("stock");
    const data = await stock.find({}).toArray();
    return data;
  } catch (err) {
    console.error("❌ Failed to load stock from database", err);
    return [];
  }
};


// --- Stock Routes ---
app.get("/api/items", async (req, res) => {
  res.json(await readData());
});

app.post("/api/items", async (req, res) => {
  try{
    const { db } = await connectToDatabase();
    const items = db.collection("stock");
    const newItem = {
      id: Date.now(),
      name: req.body.name,
      amount: req.body.amount || 0,
      price: req.body.price || 0,
      catagory: req.body.catagory,
      image: req.body.image,
      description: req.body.description,
    };
    await items.insertOne(newItem);
    res.json(newItem);
  } catch {
    console.error("❌ POST /items failed:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

app.put("/api/items/:id", async (req, res) => {
  try{
    
    const item = {
      name: req.body.name,
      amount: req.body.amount,
      price: req.body.price,
      catagory: req.body.catagory,
      image: req.body.image,
      description: req.body.description,
    };
    
    const { db } = await connectToDatabase();
    const items = db.collection("stock");
    
    await items.updateOne({ id: Number(req.params.id) }, { $set: {
      name: req.body.name,
      amount: req.body.amount,
      price: req.body.price,
      catagory: req.body.catagory,
      image: req.body.image,
      description: req.body.description,
    }});

    res.json(item);
  } catch {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
  const { db } = await connectToDatabase();
  const items = db.collection("stock");
  await items.deleteOne({ id: Number(req.params.id) });
  res.json({ success: true });
} catch (err) {
  console.error("❌ DELETE /items/:id failed:", err);
  res.status(500).json({ error: "Failed to delete items" });
}
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
app.get("/Stock", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});
app.get("/Order", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "orders.html"));
});
app.get("/", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));


export default app;
