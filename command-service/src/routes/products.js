const express = require("express");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const pool = require("../db");

// POST /api/products
router.post("/", async (req, res) => {
  const { name, category, price, stock } = req.body;

  if (!name || !category || price == null || stock == null) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, category, price, stock]
    );

    const productId = result.rows[0].id;

    const event = {
      eventId: uuidv4(),
      eventType: "ProductCreated",
      productId,
      name,
      category,
      price,
      stock,
      timestamp: new Date().toISOString(),
    };

    await client.query(
      "INSERT INTO outbox (id, topic, payload) VALUES ($1, $2, $3::jsonb)",
      [event.eventId, "product-events", JSON.stringify(event)]
    );

    await client.query("COMMIT");

    res.status(201).json({ productId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating product:", err);
    res.status(500).json({ error: "Failed to create product" });
  } finally {
    client.release();
  }
});

// PUT /api/products/:productId
router.put("/:productId", async (req, res) => {
  const { productId } = req.params;
  const { name, category, price, stock } = req.body;

  if (!productId || isNaN(productId)) {
    return res.status(400).json({ error: "Invalid productId" });
  }

  if (name == null && category == null && price == null && stock == null) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id, name, category, price, stock FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    const current = existing.rows[0];
    const updatedName = name != null ? name : current.name;
    const updatedCategory = category != null ? category : current.category;
    const updatedPrice = price != null ? price : current.price;
    const updatedStock = stock != null ? stock : current.stock;

    await client.query(
      "UPDATE products SET name = $1, category = $2, price = $3, stock = $4 WHERE id = $5",
      [updatedName, updatedCategory, updatedPrice, updatedStock, productId]
    );

    if (price != null && parseFloat(price) !== parseFloat(current.price)) {
      const priceEvent = {
        eventId: uuidv4(),
        eventType: "PriceChanged",
        productId: parseInt(productId),
        oldPrice: current.price,
        newPrice: updatedPrice,
        timestamp: new Date().toISOString(),
      };

      await client.query(
        "INSERT INTO outbox (id, topic, payload) VALUES ($1, $2, $3::jsonb)",
        [priceEvent.eventId, "product-events", JSON.stringify(priceEvent)]
      );
    }

    await client.query("COMMIT");

    res.json({ productId: parseInt(productId) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product" });
  } finally {
    client.release();
  }
});

module.exports = router;
