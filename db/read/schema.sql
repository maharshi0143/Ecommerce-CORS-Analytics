-- Product sales aggregated view (as table)
CREATE TABLE IF NOT EXISTS product_sales_view (
  product_id INT PRIMARY KEY,
  total_quantity_sold INT NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0
);

-- Category metrics aggregated view
CREATE TABLE IF NOT EXISTS category_metrics_view (
  category_name TEXT PRIMARY KEY,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0
);

-- Customer lifetime value view
CREATE TABLE IF NOT EXISTS customer_ltv_view (
  customer_id INT PRIMARY KEY,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  last_order_date TIMESTAMP
);

-- Product catalog view for product events
CREATE TABLE IF NOT EXISTS products_read_view (
  product_id INT PRIMARY KEY,
  name TEXT NULL,
  category TEXT NULL,
  price NUMERIC NULL,
  stock INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Hourly sales aggregation
CREATE TABLE IF NOT EXISTS hourly_sales_view (
  hour_timestamp TIMESTAMP PRIMARY KEY,
  total_orders INT NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0
);

-- Processed events table for idempotency
CREATE TABLE IF NOT EXISTS processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sync status table
CREATE TABLE IF NOT EXISTS sync_status (
  id INT PRIMARY KEY DEFAULT 1,
  last_processed_event_timestamp TIMESTAMP
);

-- Ensure only one row exists in sync_status
INSERT INTO sync_status (id, last_processed_event_timestamp)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
