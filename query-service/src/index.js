const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 8081;

// Middleware
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.READ_DATABASE_URL,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Import analytics routes
const analyticsRouter = require("./routes/analytics");
app.use("/api/analytics", analyticsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Query Service] Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
app.listen(port, () => {
  console.log(`Query Service running on port ${port}`);
});

module.exports = { pool };