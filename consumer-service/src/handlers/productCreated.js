async function handleProductCreated(event, pool) {
  const client = await pool.connect();

  try {
    const { eventId, productId, name, category, price, stock, timestamp } = event;

    await client.query("BEGIN");

    const processedCheck = await client.query(
      "SELECT event_id FROM processed_events WHERE event_id = $1",
      [eventId]
    );

    if (processedCheck.rows.length > 0) {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `INSERT INTO products_read_view (product_id, name, category, price, stock, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (product_id) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         price = EXCLUDED.price,
         stock = EXCLUDED.stock,
         updated_at = EXCLUDED.updated_at`,
      [productId, name, category, price, stock, timestamp]
    );

    await client.query(
      "UPDATE sync_status SET last_processed_event_timestamp = $1 WHERE id = 1",
      [timestamp]
    );

    await client.query(
      "INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW())",
      [eventId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { handleProductCreated };
