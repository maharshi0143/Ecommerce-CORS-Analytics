async function handleOrderCreated(event, pool) {
  const client = await pool.connect();

  try {
    const { eventId, orderId, customerId, items, total, timestamp } = event;

    console.log(`[OrderCreatedHandler] Processing event ${eventId}`);

    // Start transaction
    await client.query("BEGIN");

    // Step 1: Check if already processed (idempotency)
    const processedCheck = await client.query(
      "SELECT event_id FROM processed_events WHERE event_id = $1",
      [eventId]
    );

    if (processedCheck.rows.length > 0) {
      console.log(`[OrderCreatedHandler] Event ${eventId} already processed, skipping`);
      await client.query("COMMIT");
      return;
    }

    // Step 2: Update product_sales_view
    const categoriesInOrder = new Set();
    const categoryRevenueMap = new Map();
    for (const item of items) {
      const { productId, quantity, price, category } = item;
      const itemRevenue = quantity * price;

      await client.query(
        `INSERT INTO product_sales_view (product_id, total_quantity_sold, total_revenue, order_count)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (product_id) DO UPDATE SET
           total_quantity_sold = product_sales_view.total_quantity_sold + $2,
           total_revenue = product_sales_view.total_revenue + $3,
           order_count = product_sales_view.order_count + 1`,
        [productId, quantity, itemRevenue]
      );

      // Track categories for later update
      if (category) {
        categoriesInOrder.add(category);
        const currentRevenue = categoryRevenueMap.get(category) || 0;
        categoryRevenueMap.set(category, currentRevenue + itemRevenue);
      }
    }

    // Step 3: Update category_metrics_view for each category in the order
    for (const category of categoriesInOrder) {
      const categoryRevenue = categoryRevenueMap.get(category) || 0;
      await client.query(
        `INSERT INTO category_metrics_view (category_name, total_revenue, total_orders)
         VALUES ($1, $2, 1)
         ON CONFLICT (category_name) DO UPDATE SET
           total_revenue = category_metrics_view.total_revenue + $2,
           total_orders = category_metrics_view.total_orders + 1`,
        [category, categoryRevenue]
      );
    }

    // Step 4: Update customer_ltv_view
    await client.query(
      `INSERT INTO customer_ltv_view (customer_id, total_spent, order_count, last_order_date)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (customer_id) DO UPDATE SET
         total_spent = customer_ltv_view.total_spent + $2,
         order_count = customer_ltv_view.order_count + 1,
         last_order_date = $3`,
      [customerId, total, timestamp]
    );

    // Step 5: Update hourly_sales_view (truncate timestamp to hour)
    const hourTimestamp = new Date(timestamp);
    hourTimestamp.setMinutes(0, 0, 0);
    const hourStr = hourTimestamp.toISOString();

    await client.query(
      `INSERT INTO hourly_sales_view (hour_timestamp, total_orders, total_revenue)
       VALUES ($1, 1, $2)
       ON CONFLICT (hour_timestamp) DO UPDATE SET
         total_orders = hourly_sales_view.total_orders + 1,
         total_revenue = hourly_sales_view.total_revenue + $2`,
      [hourStr, total]
    );

    // Step 6: Update sync_status (track last processed event time)
    await client.query(
      `UPDATE sync_status SET last_processed_event_timestamp = $1 WHERE id = 1`,
      [timestamp]
    );

    // Step 7: Record processed event (idempotency)
    await client.query(
      `INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW())`,
      [eventId]
    );

    // Commit transaction
    await client.query("COMMIT");

    console.log(
      `[OrderCreatedHandler] Successfully updated views for order ${orderId}`
    );
  } catch (err) {
    // Rollback on error
    await client.query("ROLLBACK");
    console.error("[OrderCreatedHandler] Error processing event:", err);
    throw err; 
  } finally {
    client.release();
  }
}

module.exports = { handleOrderCreated };
