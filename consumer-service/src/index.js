const amqp = require("amqplib");
const { Pool } = require("pg");

const BROKER_URL = process.env.BROKER_URL || "amqp://guest:guest@broker:5672/";
const READ_DATABASE_URL = process.env.READ_DATABASE_URL || "postgresql://user:password@read_db:5432/read_db";
const QUEUE_NAME = "order-events";
const PREFETCH_COUNT = parseInt(process.env.RABBITMQ_PREFETCH_COUNT) || 1;

// Read database connection pool
const readPool = new Pool({
  connectionString: READ_DATABASE_URL,
});

// Event handlers
const { handleOrderCreated } = require("./handlers/orderCreated");

let channel = null;

async function startConsumer() {
  try {
    console.log("[Consumer] Connecting to RabbitMQ...");
    const connection = await amqp.connect(BROKER_URL);

    // Handle connection close
    connection.on("close", () => {
      console.error("[Consumer] RabbitMQ connection closed unexpectedly");
      setTimeout(startConsumer, 5000);
    });

    channel = await connection.createChannel();

    // Set prefetch count for QoS (process 1 message at a time)
    await channel.prefetch(PREFETCH_COUNT);

    // Declare queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`[Consumer] Queue "${QUEUE_NAME}" declared`);
    console.log("[Consumer] Waiting for messages...");

    // Consume messages
    await channel.consume(QUEUE_NAME, async (msg) => {
      if (msg === null) {
        return;
      }

      try {
        const content = JSON.parse(msg.content.toString());
        console.log(`[Consumer] Received event: ${content.eventType}`);

        // Route to appropriate handler
        if (content.eventType === "OrderCreated") {
          await handleOrderCreated(content, readPool);
          console.log(`[Consumer] Successfully processed ${content.eventType}`);
        } else {
          console.warn(`[Consumer] Unknown event type: ${content.eventType}`);
        }

        // Acknowledge message
        channel.ack(msg);
      } catch (err) {
        console.error("[Consumer] Error processing message:", err);
        // Reject and requeue on error (will be retried)
        channel.nack(msg, false, true);
      }
    });
  } catch (err) {
    console.error("[Consumer] Connection error:", err);
    console.log("[Consumer] Retrying in 5 seconds...");
    setTimeout(startConsumer, 5000);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Consumer] SIGTERM signal received: closing gracefully");
  if (channel) {
    await channel.close();
  }
  process.exit(0);
});

// Start consumer
startConsumer().catch((err) => {
  console.error("[Consumer] Failed to start:", err);
  process.exit(1);
});

module.exports = { readPool };