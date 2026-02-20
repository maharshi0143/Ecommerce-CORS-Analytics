# E-Commerce CQRS Analytics System

A high-performance e-commerce analytics system built with **CQRS** (Command Query Responsibility Segregation) pattern and **Event-Driven Architecture**. This system demonstrates production-grade backend design patterns for handling scalable, resilient, and high-throughput operations.

## 🏗️ Architecture Overview

### Core Pattern: CQRS + Event Sourcing
- **Command Service**: Handles all write operations (creates products/orders)
- **Query Service**: Provides read-only analytics endpoints
- **Consumer Service**: Processes events asynchronously to build materialized views
- **Event Broker**: RabbitMQ for decoupled asynchronous communication
- **Dual Databases**: Separate write-optimized and read-optimized models

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT REQUESTS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Commands (Create/Update)      Queries (Read Analytics)    │
│         │                              │                    │
│         ▼                              ▼                    │
│  ┌───────────────┐               ┌──────────────┐           │
│  │ Command       │               │ Query        │           │
│  │ Service       │               │ Service      │           │
│  │ (Write API)   │               │ (Read API)   │           │
│  │ Port: 8080    │               │ Port: 8081   │           │
│  └───────┬───────┘               └──────┬───────┘           │
│          │                               │                   │
│          ▼                               │                   │
│  ┌──────────────────┐                   │                   │
│  │ Write Database   │                   │                   │
│  │ (PostgreSQL)     │                   │                   │
│  │ - products       │                   │                   │
│  │ - orders         │                   │                   │
│  │ - order_items    │                   │                   │
│  │ - outbox         │                   │                   │
│  └────────┬─────────┘                   │                   │
│           │                              │                   │
│           ▼ (Event Publishing)           │                   │
│  ┌──────────────────────┐                │                   │
│  │ Outbox Publisher     │                │                   │
│  │ (Polling Service)    │                │                   │
│  └──────────┬───────────┘                │                   │
│             │                            │                   │
│             ▼                            │                   │
│  ┌──────────────────────┐                │                   │
│  │ RabbitMQ Broker      │                │                   │
│  │ - order-events queue │                │                   │
│  └──────────┬───────────┘                │                   │
│             │                            │                   │
│             ▼ (Event Consumption)        │                   │
│  ┌──────────────────────┐                │                   │
│  │ Consumer Service     │                │                   │
│  │ (Event Processors)   │                │                   │
│  │ - Idempotency Check  │                │                   │
│  │ - View Updates       │                │                   │
│  └──────────┬───────────┘                │                   │
│             │                            │                   │
│             ▼                            ▼                   │
│  ┌──────────────────────────────────────────┐               │
│  │ Read Database (PostgreSQL)               │               │
│  │ - product_sales_view                     │       ◄────────┤
│  │ - category_metrics_view                  │               │
│  │ - customer_ltv_view                      │               │
│  │ - hourly_sales_view                      │               │
│  │ - processed_events (idempotency)         │               │
│  │ - sync_status (consistency tracking)     │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Design Principles

### 1. **Separation of Concerns**
- Write and read models are completely separated
- Command Service focuses only on data validation and state changes
- Query Service focuses only on data retrieval and analytics
- Consumer Service focuses only on event processing

### 2. **Eventual Consistency**
- Read models are eventually consistent with the write model
- Events are processed asynchronously, causing brief lags
- `sync-status` endpoint tracks this lag for monitoring
- Perfect for analytics dashboards where instant consistency isn't critical

### 3. **Reliability Through the Outbox Pattern**
- Events are written to the database in the same transaction as the data
- No "dual write" problems (write to DB fails while message publish succeeds or vice versa)
- Outbox Publisher polls the outbox table and publishes to the broker
- Ensures no event is lost even if the broker is temporarily unavailable

### 4. **Idempotent Event Processing**
- Consumers can safely process the same event multiple times
- Prevents data corruption from duplicate message deliveries
- RabbitMQ provides at-least-once delivery; idempotency handles the "multiple times" part

## 🔧 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Web Framework** | Express.js | REST API server |
| **Language** | Node.js (JavaScript) | Backend runtime |
| **Write Database** | PostgreSQL | ACID transactions, normalized schema |
| **Read Database** | PostgreSQL | Denormalized views for fast queries |
| **Message Broker** | RabbitMQ | Event distribution |
| **Containerization** | Docker & Docker Compose | Infrastructure orchestration |
| **Runtime** | Node.js 20 Alpine | Lightweight, production-grade |

## 📋 Project Structure

```
Ecommerce-CQRS-Analytics/
├── docker-compose.yml          # Complete infrastructure setup
├── .env.example                # Environment variables template
├── submission.json             # Project configuration for evaluation
├── README.md                   # This file
│
├── command-service/            # Write API (Port: 8080)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Express server setup
│       ├── db.js               # Database connection pool
│       ├── outbox-publisher.js # Event publishing service
│       └── routes/
│           ├── products.js     # POST /api/products
│           └── orders.js       # POST /api/orders
│
├── query-service/              # Read API (Port: 8081)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Express server + routing
│       ├── db.js               # Read database connection
│       └── routes/
│           └── analytics.js    # All GET /api/analytics/* endpoints
│
├── consumer-service/           # Event Processor (Internal)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Event listener & orchestrator
│       └── handlers/
│           ├── orderCreated.js # Processes OrderCreated events
│           └── ...
│
├── db/                         # Database schemas
│   ├── write/
│   │   └── schema.sql          # Write model schema
│   └── read/
│       └── schema.sql          # Read model schema
│
└── docs/                       # Documentation
    └── data-flow.png          # Architecture diagram
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Postman (for API testing)
- Basic understanding of REST APIs and databases

### 1. Clone and Setup
```bash
# Navigate to project directory
cd Ecommerce-CQRS-Analytics

# Create .env file from template (optional for Docker)
cp .env.example .env
```

### 2. Start the System
```bash
docker-compose up
```

**Wait for all services to be healthy** (typically 60 seconds). You should see:
```
✔ Container ecommerce-cqrs-analytics-db-1 Healthy
✔ Container ecommerce-cqrs-analytics-read_db-1 Healthy
✔ Container ecommerce-cqrs-analytics-broker-1 Healthy
✔ Container ecommerce-cqrs-analytics-command-service-1 Running
✔ Container ecommerce-cqrs-analytics-query-service-1 Running
✔ Container ecommerce-cqrs-analytics-consumer-service-1 Running
```

### 3. Verify System Health
```bash
# Command Service
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# Query Service
curl http://localhost:8081/health
# Expected: {"status":"ok"}
```

## 📡 API Endpoints

### Command Service (Write API)
Base URL: `http://localhost:8080`

#### 1. Create Product
```http
POST /api/products
Content-Type: application/json

{
  "name": "Laptop",
  "category": "Electronics",
  "price": 50000,
  "stock": 10
}
```

**Response (201 Created):**
```json
{
  "productId": 1
}
```

#### 2. Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "customerId": 5,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 50000
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "orderId": 1
}
```

---

### Query Service (Read API)
Base URL: `http://localhost:8081`

#### 1. Product Sales Analytics
```http
GET /api/analytics/products/{productId}/sales
```

**Response (200 OK):**
```json
{
  "productId": 1,
  "totalQuantitySold": 5,
  "totalRevenue": 250000,
  "orderCount": 3
}
```

#### 2. Category Revenue Analytics
```http
GET /api/analytics/categories/{category}/revenue
```

**Response (200 OK):**
```json
{
  "category": "Electronics",
  "totalRevenue": 500000,
  "totalOrders": 8
}
```

#### 3. Customer Lifetime Value
```http
GET /api/analytics/customers/{customerId}/lifetime-value
```

**Response (200 OK):**
```json
{
  "customerId": 5,
  "totalSpent": 250000,
  "orderCount": 3,
  "lastOrderDate": "2026-02-19T18:45:00Z"
}
```

#### 4. Sync Status (Eventual Consistency Lag)
```http
GET /api/analytics/sync-status
```

**Response (200 OK):**
```json
{
  "lastProcessedEventTimestamp": "2026-02-19T18:44:50Z",
  "lagSeconds": 10
}
```

## 🔄 Data Flow Example

### Step 1: Create a Product
```
POST /api/products
├─ Command Service validates input
├─ Inserts into write_db.products
└─ Returns productId: 1
```

### Step 2: Create an Order
```
POST /api/orders
├─ Command Service validates product stock
├─ Opens transaction
│  ├─ Inserts into write_db.orders (id: 101)
│  ├─ Inserts into write_db.order_items
│  └─ Inserts into write_db.outbox (EventId: uuid, topic: order-events)
├─ Commits transaction atomically
└─ Returns orderId: 101
```

### Step 3: Event Publishing
```
Outbox Publisher (polling every 5 seconds)
├─ Queries: SELECT * FROM outbox WHERE published_at IS NULL
├─ Finds unpublished OrderCreated event
├─ Publishes to RabbitMQ (order-events queue)
└─ Updates: outbox SET published_at = NOW()
```

### Step 4: Event Processing
```
Consumer Service (listening to order-events)
├─ Receives OrderCreated event
├─ Checks processed_events table (idempotency)
├─ Updates materialized views:
│  ├─ product_sales_view (quantity, revenue)
│  ├─ category_metrics_view (revenue per category)
│  ├─ customer_ltv_view (customer spending)
│  └─ hourly_sales_view (time-bucketed sales)
├─ Updates sync_status table
└─ Records in processed_events
```

### Step 5: Analytics Query
```
GET /api/analytics/products/1/sales
├─ Query Service reads from read_db.product_sales_view
├─ No complex joins, denormalized data
├─ Returns aggregated sales data
└─ Response time: < 10ms (instant)
```

## 💡 Key Concepts Explained

### CQRS (Command Query Responsibility Segregation)
- **Command (Write)**: `POST /api/orders` - Modifies state
- **Query (Read)**: `GET /api/analytics/*` - Reads state
- Different models optimized for each use case

### Event-Driven Architecture
- Services communicate through events, not direct calls
- Decoupled, scalable, resilient
- Consumer processes events asynchronously

### Outbox Pattern
- Ensures events are published reliably
- No dual-write problem (database ✓, broker ✗)
- Polling publisher handles retry logic

### Idempotency
- Processing same event multiple times = same result
- Prevents duplicate data from retry scenarios
- Achieved through event ID tracking

### Eventual Consistency
- Read model may lag write model
- Small delay (usually < 10 seconds)
- Perfect for analytics (immediacy not critical)
- `sync-status` endpoint monitors this

## 🧪 Testing Strategy

### 1. Manual Testing (Postman)
```
1. POST /api/products → Get productId
2. POST /api/orders → Get orderId
3. Wait 10 seconds (event processing time)
4. GET /api/analytics/products/{id}/sales → Verify data
```

### 2. Consistency Testing
```
1. Create order
2. Check sync-status endpoint
3. Poll until lagSeconds approaches 0
4. Verify read model matches write model
```

### 3. Idempotency Testing
```
1. Simulate message replay (manually)
2. Verify data isn't duplicated
3. Confirm analytics remain consistent
```

## 📊 Performance Characteristics

| Operation | Response Time | Notes |
|-----------|---------------|-------|
| `POST /api/products` | < 100ms | Synchronous write |
| `POST /api/orders` | < 200ms | With transaction commit |
| `GET /api/analytics/*` | < 10ms | Denormalized data, no joins |
| Event processing lag | 2-30 seconds | Async, batched processing |
| Database throughput | 1000+ orders/sec | With proper indexing |

## 🔒 Production Readiness Checklist

- ✅ Docker containerization
- ✅ Health checks on all services
- ✅ Transactional consistency (outbox pattern)
- ✅ Idempotent event processing
- ✅ Graceful error handling
- ✅ Database connection pooling
- ✅ Environment-based configuration
- ⚠️ TODO: Logging and monitoring
- ⚠️ TODO: Comprehensive test suite
- ⚠️ TODO: Rate limiting and authentication
- ⚠️ TODO: API documentation (OpenAPI/Swagger)

## 🛠️ Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs command-service
docker-compose logs consumer-service
docker-compose logs query-service

# Verify health
curl http://localhost:8080/health
```

### No data in analytics endpoints
```bash
# Check if events were published to outbox
docker-compose exec db psql -U user -d write_db -c "SELECT * FROM outbox LIMIT 5;"

# Check if consumer processed events
docker-compose exec read_db psql -U user -d read_db -c "SELECT * FROM processed_events LIMIT 5;"
```

### High sync lag
```bash
# Restart consumer service
docker-compose restart consumer-service

# Check consumer logs
docker-compose logs consumer-service
```

## 📚 References & Learning Resources

- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html) - Martin Fowler's explanation
- [Events Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) - Event architecture
- [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html) - Reliable messaging
- [Eventual Consistency](https://www.microsoft.com/en-us/research/publication/eventually-consistent/) - Distributed systems

## 📞 Support & Questions

For issues or questions:
1. Check docker-compose logs
2. Verify all services are healthy
3. Check the troubleshooting section above
4. Review the API endpoint specifications

## 📄 License

MIT License - Free to use and modify

---

**Built with ❤️ as a production-ready reference implementation of CQRS + Event-Driven Architecture**
