const { startOutboxPublisher } = require("./outbox-publisher");
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 8080;

// Middleware to parse JSON
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Import routes
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

// Start server
app.listen(port, () => {
  console.log(`Command Service running on port ${port}`);
});

startOutboxPublisher().catch((err) => {
  console.error("Failed to start outbox publisher:", err);
});


// Export pool so routes can use it
module.exports = { pool };
