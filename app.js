const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const dataFile = path.join(__dirname, "data", "stock.json");

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "Pages")));

// Utility: read/write JSON
const readData = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));
const writeData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

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

app.get("/Stock", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});

app.get("/Orders", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "orders.html"));
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
