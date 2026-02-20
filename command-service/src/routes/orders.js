const express = require("express");
const router = express.Router();
const pool = require("../db");
const { v4: uuidv4 } = require("uuid");

// POST /api/orders
router.post("/", async (req, res) => {
  const { customerId, items } = req.body;

  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure customer exists (minimal record)
    await client.query(
      "INSERT INTO customers (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
      [customerId]
    );

    // Calculate total and validate stock
    let total = 0;
    for (const item of items) {
      const productResult = await client.query(
        "SELECT stock, category FROM products WHERE id = $1 FOR UPDATE",
        [item.productId]
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Product not found" });
      }

      const { stock } = productResult.rows[0];
      if (stock < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Insufficient stock" });
      }

      total += item.price * item.quantity;
    }

    // Insert into orders
    const orderResult = await client.query(
      "INSERT INTO orders (customer_id, total, status) VALUES ($1, $2, $3) RETURNING id",
      [customerId, total, "CREATED"]
    );

    const orderId = orderResult.rows[0].id;

    // Enrich items with product details (category) for event and decrement stock
    const enrichedItems = [];
    for (const item of items) {
      await client.query(
        "UPDATE products SET stock = stock - $2 WHERE id = $1",
        [item.productId, item.quantity]
      );

      // Insert order item
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [orderId, item.productId, item.quantity, item.price]
      );

      // Get product details for event
      const productResult = await client.query(
        "SELECT category FROM products WHERE id = $1",
        [item.productId]
      );

      enrichedItems.push({
        ...item,
        category: productResult.rows[0]?.category || "Uncategorized"
      });
    }

    // Create event
    const event = {
      eventId: uuidv4(),
      eventType: "OrderCreated",
      orderId,
      customerId,
      items: enrichedItems,
      total,
      timestamp: new Date().toISOString(),
    };

    // Insert into outbox
    await client.query(
      "INSERT INTO outbox (id, topic, payload) VALUES ($1, $2, $3::jsonb)",
      [event.eventId, "order-events", JSON.stringify(event)]
    );

    await client.query("COMMIT");

    res.status(201).json({ orderId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating order:", err);
    res.status(500).json({ error: "Failed to create order" });
  } finally {
    client.release();
  }
});

module.exports = router;
