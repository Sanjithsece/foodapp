require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose
  .connect("mongodb+srv://sanjithcce:sanjith27399@cluster0.fsgus.mongodb.net/")
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Database connection error:", err));

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access Denied. No token provided." });

  jwt.verify(token, process.env.JWT_SECRET, (err, verified) => {
    if (err) return res.status(400).json({ message: "Invalid token." });
    req.user = verified;
    next();
  });
};

// Signup Route
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(" User not found for email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log(" User found:", user);

    // Compare hashed password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log(" Password Match:", validPassword);

    if (!validPassword) {
      console.log(" Incorrect password for:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(" Login successful for:", email);
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// Food Item Schema and Model
const foodItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  rating: { type: String },
  price: { type: Number, required: true },
});

const FoodItem = mongoose.model("FoodItem", foodItemSchema);

// Order Schema and Model
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  items: [{ id: String, name: String, quantity: Number }],
  totalPrice: { type: Number, required: true },
  customerName: { type: String, required: true },
  status: { type: String, default: "Pending" },
});

const Order = mongoose.model("Order", orderSchema);

// Get all food items
app.get("/api/food", async (req, res) => {
  try {
    const foodItems = await FoodItem.find();
    res.status(200).json(foodItems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch food items", error: error.message });
  }
});
// Create a new food item
app.post("/api/food", async (req, res) => {
  const { id, name, rating, price } = req.body;

  if (!id || !name || !price) {
    return res.status(400).json({ message: "ID, Name, and Price are required" });
  }

  try {
    const newFoodItem = new FoodItem({ id, name, rating, price });
    await newFoodItem.save();
    res.status(201).json(newFoodItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to add food item", error: error.message });
  }
});


// Place a new order
// Place a new order
app.post("/api/orders", async (req, res) => {
  const { items, customerName } = req.body;

  // Validation for the request body
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "Items must be a non-empty array" });
  }

  if (!customerName) {
    return res.status(400).json({ message: "Customer name is required" });
  }

  try {
    let totalPrice = 0;

    // Loop through the items to get the details from the FoodItem collection
    for (const item of items) {
      const foodItem = await FoodItem.findOne({ id: item.id });
      if (!foodItem) {
        return res.status(404).json({ message: `Food item ${item.name} not found.` });
      }
      totalPrice += foodItem.price * item.quantity;
    }

    // Create the new order with the total price
    const newOrder = new Order({
      id: new mongoose.Types.ObjectId().toString(),
      items,
      totalPrice,
      customerName,
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);  // Return the saved order details
  } catch (error) {
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
  console.log(`Server is running on http://localhost:${3000}`);
});
