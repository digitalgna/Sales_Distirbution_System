const express = require( "express");
const cors = require("cors");
const helmet =  require("helmet");
const { sequelize, User, Role, Permission, Category, Item, Stockout, Store, Warehouse, Return, Supplier, } = require ("./models/index.js");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());  

// Test route
app.get("/", (req, res) => res.send("API is running..."));

// Sync DB
sequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Database synced successfully"))
  .catch((err) => console.error("❌ Database sync error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
