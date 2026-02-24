
const express = require("express");
const path = require("path");
const {supabase} = require('./supabase/client');
const app = express();
const PORT = process.env.PORT;
const requireAuth = require("./middleware/auth");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
require("dotenv").config();


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());

// Serve static FIRST and without auth
app.use(express.static(path.join(__dirname, "Pages")));

// Handle login POST request
app.post("/api/login",  async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.log(error);
    return res.send('<script>alert("'+error.message+'"); window.location.href = "/";</script>');
  }

  if (!data?.session) {
    return res.send('<script>alert("No session found. Please verify your email."); window.location.href = "/";</script>');
  }

  res.cookie("sb_token", data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });
  res.redirect("/Stock");
});

// Signup endpoint
app.post("/api/signup", async (req, res) => {
  const { email , password } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.log(error);
    res.status(302).redirect("/signup"); 
  }

  res.cookie("sb_token", data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  res.redirect("/Stock");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});





// --- Stock Routes ---
app.get("/api/items", requireAuth("admin"), async (req, res) => {

  let { data: stock, error } = await supabase
    .from('stock')
    .select('*');

  if (error) {
    console.error('Error fetching Stock:', error);
    res.json([]);
  }

  res.json(stock);

});

app.post("/api/items", requireAuth("admin"), async (req, res) => {
    const { data, error } = await supabase
      .from('stock')
      .insert([
        { name: req.body.name, amount: req.body.amount || 0, price: req.body.price || 0, category: req.body.category, image: req.body.image, description: req.body.description},
      ])
      .select();
          

    if (error) {
    console.error('Failed To Insert New Item:', error);
    res.json({});
    }
    console.log(data);
    res.json(data[0]);
});

app.put("/api/items/:id", requireAuth("admin"), async (req, res) => {
   
  const { data, error } = await supabase
    .from('stock')
    .update({ 
      name: req.body.name,
      amount: req.body.amount,
      price: req.body.price,
      category: req.body.category,
      image: req.body.image,
      description: req.body.description
    })
    .eq('id', req.params.id)
    .select();
          
    
    if (error) {
    console.error('Failed To Update Row:', error);
    res.json({});
    }

    if (!data[0]){
      console.log(data)
      console.log(req.params.id)
    }
    res.json(data[0]);
});

app.delete("/api/items/:id", requireAuth("admin"), async (req, res) => {
  const { error } = await supabase
    .from('stock')
    .delete()
    .eq('id', req.params.id);
  
  if (error) {
  console.error('Failed To Delete row:', error);
  res.json({ success: false });
  }

  res.json({ success: true });

});

// --- MongoDB Orders API Converting to Supabase---
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
app.get("/Stock", requireAuth("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "stock.html"));
});
app.get("/Order", requireAuth("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "orders.html"));
});
// Serve the login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "login.html"));
});
// Serve the Signup page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "Pages", "signup.html"));
});

app.get("/", (req, res) => {
  res.redirect("/login");
});


app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));


module.exports = app;
