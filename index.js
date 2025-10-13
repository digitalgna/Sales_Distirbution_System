const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path"); 
const { sequelize } = require("./models/index.js");
const routes = require("./routes"); 

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet()); // Secure headers

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test route
app.get("/", (req, res) => res.send("API is running..."));

// Mount all routes under /api
app.use("/api", routes);

// Sync DB
sequelize
  .sync({ alter: false })
  .then(() => console.log("✅ Database synced successfully"))
  .catch((err) => console.error("❌ Database sync error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
