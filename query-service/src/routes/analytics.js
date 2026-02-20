const express = require("express");
const router = express.Router();
const pool = require("../db");

/**
 * GET /api/analytics/products/{productId}/sales
 * Returns sales analytics for a specific product
 */
router.get("/products/:productId/sales", async (req, res) => {
  const { productId } = req.params;

  if (!productId || isNaN(productId)) {
    return res.status(400).json({ error: "Invalid productId" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        product_id as "productId",
        total_quantity_sold as "totalQuantitySold",
        total_revenue as "totalRevenue",
        order_count as "orderCount"
       FROM product_sales_view
       WHERE product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const data = result.rows[0];

    // Ensure numeric types
    res.json({
      productId: parseInt(data.productId),
      totalQuantitySold: parseInt(data.totalQuantitySold) || 0,
      totalRevenue: parseFloat(data.totalRevenue) || 0,
      orderCount: parseInt(data.orderCount) || 0,
    });
  } catch (err) {
    console.error("[Analytics] Error fetching product sales:", err);
    res.status(500).json({ error: "Failed to fetch product sales" });
  }
});

/**
 * GET /api/analytics/categories/{category}/revenue
 * Returns revenue analytics for a specific category
 */
router.get("/categories/:category/revenue", async (req, res) => {
  const { category } = req.params;

  if (!category || category.trim() === "") {
    return res.status(400).json({ error: "Invalid category" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        category_name as "category",
        total_revenue as "totalRevenue",
        total_orders as "totalOrders"
       FROM category_metrics_view
       WHERE LOWER(category_name) = LOWER($1)`,
      [category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const data = result.rows[0];

    // Ensure numeric types
    res.json({
      category: data.category,
      totalRevenue: parseFloat(data.totalRevenue) || 0,
      totalOrders: parseInt(data.totalOrders) || 0,
    });
  } catch (err) {
    console.error("[Analytics] Error fetching category revenue:", err);
    res.status(500).json({ error: "Failed to fetch category revenue" });
  }
});

/**
 * GET /api/analytics/customers/{customerId}/lifetime-value
 * Returns customer lifetime value metrics
 */
router.get("/customers/:customerId/lifetime-value", async (req, res) => {
  const { customerId } = req.params;

  if (!customerId || isNaN(customerId)) {
    return res.status(400).json({ error: "Invalid customerId" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        customer_id as "customerId",
        total_spent as "totalSpent",
        order_count as "orderCount",
        last_order_date as "lastOrderDate"
       FROM customer_ltv_view
       WHERE customer_id = $1`,
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const data = result.rows[0];

    // Format response
    res.json({
      customerId: parseInt(data.customerId),
      totalSpent: parseFloat(data.totalSpent) || 0,
      orderCount: parseInt(data.orderCount) || 0,
      lastOrderDate: data.lastOrderDate ? data.lastOrderDate.toISOString() : null,
    });
  } catch (err) {
    console.error("[Analytics] Error fetching customer LTV:", err);
    res.status(500).json({ error: "Failed to fetch customer lifetime value" });
  }
});

/**
 * GET /api/analytics/sync-status
 * Returns the lag between write and read models (eventual consistency lag)
 */
router.get("/sync-status", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        last_processed_event_timestamp as "lastProcessedEventTimestamp"
       FROM sync_status
       WHERE id = 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        lastProcessedEventTimestamp: null,
        lagSeconds: null,
      });
    }

    const lastProcessedTimestamp = result.rows[0].lastProcessedEventTimestamp;

    // Calculate lag in seconds
    let lagSeconds = null;
    if (lastProcessedTimestamp) {
      const now = new Date();
      const lastProcessed = new Date(lastProcessedTimestamp);
      lagSeconds = Math.max(0, Math.round((now - lastProcessed) / 1000));
    }

    res.json({
      lastProcessedEventTimestamp: lastProcessedTimestamp
        ? lastProcessedTimestamp.toISOString()
        : null,
      lagSeconds: lagSeconds,
    });
  } catch (err) {
    console.error("[Analytics] Error fetching sync status:", err);
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});

module.exports = router;
