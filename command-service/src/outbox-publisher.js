const amqp = require("amqplib");
const pool = require("./db");

const BROKER_URL = process.env.BROKER_URL;
const QUEUE_NAME = "order-events";

async function startOutboxPublisher() {
  console.log("Starting Outbox Publisher...");

  // Connect to RabbitMQ
  const connection = await amqp.connect(BROKER_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  console.log("Outbox Publisher connected to RabbitMQ");

  // Poll every 5 seconds
  setInterval(async () => {
    const client = await pool.connect();
    try {
      // Get unpublished events
      const result = await client.query(
        "SELECT id, topic, payload FROM outbox WHERE published_at IS NULL ORDER BY created_at ASC LIMIT 10"
      );

      for (const row of result.rows) {
        const eventId = row.id;
        const topic = row.topic;
        const payload = row.payload;

        // Publish to RabbitMQ
        channel.sendToQueue(topic, Buffer.from(JSON.stringify(payload)), {
          persistent: true,
        });

        console.log("Published event to RabbitMQ:", eventId);

        // Mark as published
        await client.query(
          "UPDATE outbox SET published_at = NOW() WHERE id = $1",
          [eventId]
        );
      }
    } catch (err) {
      console.error("Error in outbox publisher:", err);
    } finally {
      client.release();
    }
  }, 5000);
}

module.exports = { startOutboxPublisher };
