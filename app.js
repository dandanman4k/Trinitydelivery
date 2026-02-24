
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

// --- Supabase Orders API ---
app.get("/api/orders", async (req, res) => {
  const { customerID } = req.query;
  if(customerID) {
    let { data: orders, error } = await supabase
        .from('orders')
        .select("customerID,"+customerID);
    
    if (error) {
      console.error('Error fetching Orders:', error);
      res.json([]);
    }

    res.json(orders);
  } else {
    let { data: orders, error } = await supabase
      .from('orders')
      .select('*');

    if (error) {
      console.error('Error fetching Orders:', error);
      res.json([]);
    }

    res.json(orders);
  }
});

app.post("/api/orders", async (req, res) => {
  const newOrder = {
      ...req.body,
      orderFilled: false,
    };
  
  const { data: order, error } = await supabase
    .from('orders')
    .update(
      { 
      amount: newOrder.amount,
      customerName: newOrder.customerName,
      location: newOrder.location ,
      phoneNumber: newOrder.phoneNumber,
      orderFilled: newOrder.orderFilled,
      item: newOrder.item,
      customerID: newOrder.customerId
      }
    ).eq('id', newOrder.id)
    .select();

  if (error) {
    console.error("❌ POST /orders failed:", error);
    res.status(500).json({ error: "Failed to add order" });
  }
  
  res.status(201).json(order);
});

app.put("/api/orders/:id/fill", async (req, res) => {

  let { data: item, error: orderCheck} = await supabase.from('orders').select('*').eq('id', req.params.id).single();

  if (orderCheck) {
    console.error('Order not found:', orderCheck);
    res.status(404).json({ error: "Order not found" });
  }

  let {data: drug, error: stockCheck} = await supabase.from('stock').select('amount').eq('id', item.item).single();

  if(stockCheck){
    console.error('Failed to Get item:', stockCheck);
    res.status(404).json({ error: "Failed To Find Item" });
  } else {
    if (drug.amount < item.amount) {
      res.status(404).json({ error: "Failed To Fill Amount Too High" });
    }
  }

  let {data: order, error: orderFill} = await supabase
  .from('orders')
  .update({ orderFilled: true })
  .eq('id', req.params.id).single();

  if (orderFill) {
    console.error('Failed to Update Order:', orderFill);
    res.status(404).json({ error: "Failed to Update Order" });
  }

  let {error: stockUpdate} = await supabase
  .from('stock')
  .update({ amount: drug.amount - item.amount })
  .eq('id', item.item);

  if (stockUpdate) {
    console.error('Failed to Update Order:', stockUpdate);
    res.status(404).json({ error: "Failed to Update Order" });
  }

  res.json(order);
});

app.delete("/api/orders/:id", async (req, res) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    console.error('Failed To Delete row:', error);
    res.json({ success: false });
  }

  res.json({ success: true });
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
