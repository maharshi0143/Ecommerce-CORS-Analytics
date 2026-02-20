# API Reference Guide

## Quick Reference

### Base URLs
- **Command Service (Write)**: `http://localhost:8080`
- **Query Service (Read)**: `http://localhost:8081`

---

## Command Service (Write API)

### POST /api/products
**Create a new product**

#### Request
```http
POST http://localhost:8080/api/products
Content-Type: application/json

{
  "name": "Laptop",
  "category": "Electronics",
  "price": 50000,
  "stock": 10
}
```

#### Response (201 Created)
```json
{
  "productId": 1
}
```

#### cURL Example
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","category":"Electronics","price":50000,"stock":10}'
```

#### PowerShell Example
```powershell
$body = @{
    name = "Laptop"
    category = "Electronics"
    price = 50000
    stock = 10
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:8080/api/products" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

---

### POST /api/orders
**Create a new order**

#### Request
```http
POST http://localhost:8080/api/orders
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

#### Response (201 Created)
```json
{
  "orderId": 1
}
```

#### Multiple Items Example
```json
{
  "customerId": 10,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 50000
    },
    {
      "productId": 2,
      "quantity": 3,
      "price": 5000
    }
  ]
}
```

#### cURL Example
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 5,
    "items": [
      {
        "productId": 1,
        "quantity": 2,
        "price": 50000
      }
    ]
  }'
```

#### PowerShell Example
```powershell
$body = @{
    customerId = 5
    items = @(
        @{
            productId = 1
            quantity = 2
            price = 50000
        }
    )
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:8080/api/orders" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

---

### GET /health
**Health check for Command Service**

#### Request
```http
GET http://localhost:8080/health
```

#### Response (200 OK)
```json
{
  "status": "ok"
}
```

---

## Query Service (Read API)

### GET /api/analytics/products/{productId}/sales
**Get product sales analytics**

#### Request
```http
GET http://localhost:8081/api/analytics/products/1/sales
```

#### Response (200 OK)
```json
{
  "productId": 1,
  "totalQuantitySold": 5,
  "totalRevenue": 250000,
  "orderCount": 3
}
```

#### Field Descriptions
| Field | Type | Description |
|-------|------|-------------|
| `productId` | integer | The product ID |
| `totalQuantitySold` | integer | Total units sold across all orders |
| `totalRevenue` | number | Total revenue from all orders |
| `orderCount` | integer | Number of orders containing this product |

#### cURL Example
```bash
curl http://localhost:8081/api/analytics/products/1/sales
```

#### PowerShell Example
```powershell
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/products/1/sales" `
  -UseBasicParsing | ConvertFrom-Json
```

---

### GET /api/analytics/categories/{category}/revenue
**Get category revenue analytics**

#### Request
```http
GET http://localhost:8081/api/analytics/categories/Electronics/revenue
```

#### Response (200 OK)
```json
{
  "category": "Electronics",
  "totalRevenue": 500000,
  "totalOrders": 8
}
```

#### Field Descriptions
| Field | Type | Description |
|-------|------|-------------|
| `category` | string | Category name |
| `totalRevenue` | number | Total revenue for all products in category |
| `totalOrders` | integer | Total orders containing products from this category |

#### URL Encoding Note
For categories with spaces, use URL encoding:
- "Home & Kitchen" → "Home%20%26%20Kitchen"
- "Health & Beauty" → "Health%20%26%20Beauty"

#### cURL Example
```bash
curl "http://localhost:8081/api/analytics/categories/Electronics/revenue"
```

#### PowerShell Example
```powershell
$category = "Electronics"
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/categories/$category/revenue" `
  -UseBasicParsing | ConvertFrom-Json
```

---

### GET /api/analytics/customers/{customerId}/lifetime-value
**Get customer lifetime value metrics**

#### Request
```http
GET http://localhost:8081/api/analytics/customers/5/lifetime-value
```

#### Response (200 OK)
```json
{
  "customerId": 5,
  "totalSpent": 250000,
  "orderCount": 3,
  "lastOrderDate": "2026-02-19T18:45:30Z"
}
```

#### Field Descriptions
| Field | Type | Description |
|-------|------|-------------|
| `customerId` | integer | The customer ID |
| `totalSpent` | number | Total amount spent by customer |
| `orderCount` | integer | Total orders placed by customer |
| `lastOrderDate` | string (ISO 8601) | Timestamp of most recent order |

#### cURL Example
```bash
curl http://localhost:8081/api/analytics/customers/5/lifetime-value
```

#### PowerShell Example
```powershell
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/customers/5/lifetime-value" `
  -UseBasicParsing | ConvertFrom-Json
```

---

### GET /api/analytics/sync-status
**Get system sync status (eventual consistency lag)**

#### Request
```http
GET http://localhost:8081/api/analytics/sync-status
```

#### Response (200 OK)
```json
{
  "lastProcessedEventTimestamp": "2026-02-19T18:45:30Z",
  "lagSeconds": 5
}
```

#### Field Descriptions
| Field | Type | Description |
|-------|------|-------------|
| `lastProcessedEventTimestamp` | string (ISO 8601) | Timestamp of last processed event (null if no events) |
| `lagSeconds` | integer | Seconds between last event and now (eventual consistency lag) |

#### Interpreting lagSeconds
| Value | Status | Interpretation |
|-------|--------|-----------------|
| 0-5 | ✅ Good | System fully caught up |
| 5-30 | ✅ Acceptable | Normal processing lag |
| 30-60 | ⚠️ Warning | Consumer may be slow |
| > 60 | 🔴 Error | Consumer is stuck or failing |
| null | 🔒 No Data | No events processed yet |

#### cURL Example
```bash
curl http://localhost:8081/api/analytics/sync-status
```

#### PowerShell Example
```powershell
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/sync-status" `
  -UseBasicParsing | ConvertFrom-Json
```

---

### GET /health
**Health check for Query Service**

#### Request
```http
GET http://localhost:8081/health
```

#### Response (200 OK)
```json
{
  "status": "ok"
}
```

---

## Error Responses

### 400 Bad Request
Returned when input validation fails

```json
{
  "error": "Invalid productId"
}
```

### 404 Not Found
Returned when resource doesn't exist

```json
{
  "error": "Product not found"
}
```

```json
{
  "error": "Customer not found"
}
```

### 500 Internal Server Error
Returned when server encounters an error

```json
{
  "error": "Internal server error"
}
```

---

## Data Flow Example

### Scenario: Create and Analyze an Order

#### Step 1: Create Product (t=0s)
```bash
POST /api/products
{
  "name": "Laptop",
  "category": "Electronics",
  "price": 50000,
  "stock": 10
}
→ Response: {"productId": 1}
```

#### Step 2: Create Order (t=1s)
```bash
POST /api/orders
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
→ Response: {"orderId": 1}
```

**Behind the scenes:**
- Order written to write database
- Order items written
- OrderCreated event written to outbox table
- All in single transaction ✅

#### Step 3: Wait for Processing (t=2-12s)
```
t=2s:  Outbox publisher polls, finds event
t=3s:  Event published to RabbitMQ
t=4-6s: Consumer processes event
t=7-8s: Materialized views updated
t=12s: System fully caught up
```

#### Step 4: Query Analytics (t=13s+)
```bash
GET /api/analytics/products/1/sales
→ Response: {
    "productId": 1,
    "totalQuantitySold": 2,
    "totalRevenue": 100000,
    "orderCount": 1
  }
```

#### Step 5: Check Sync Status (t=13s+)
```bash
GET /api/analytics/sync-status
→ Response: {
    "lastProcessedEventTimestamp": "2026-02-19T13:42:08Z",
    "lagSeconds": 1
  }
```

---

## Performance Characteristics

### Write Operations (Command Service)
| Operation | Response Time | Notes |
|-----------|---------------|-------|
| POST /api/products | < 100ms | Single row insert |
| POST /api/orders | < 200ms | Transaction with multiple inserts + outbox |

### Read Operations (Query Service)
| Operation | Response Time | Database |
|-----------|---------------|-----------| 
| GET /api/analytics/products/.../sales | < 10ms | Denormalized view (no joins) |
| GET /api/analytics/categories/.../revenue | < 10ms | Denormalized view (no joins) |
| GET /api/analytics/customers/.../lifetime-value | < 10ms | Denormalized view (no joins) |
| GET /api/analytics/sync-status | < 10ms | Single row lookup |

### Event Processing
| Stage | Duration | Notes |
|-------|----------|-------|
| Outbox polling | 5 seconds | Configurable interval |
| Event publishing | < 1 second | To RabbitMQ |
| Consumer processing | 1-3 seconds | Per event, multiple view updates |
| **Total lag** | 6-30 seconds | Typical, varies with load |

---

## Testing Checklist

- [ ] Services are running: `docker ps`
- [ ] Health endpoints return 200: `curl http://localhost:8080/health`
- [ ] Create product: `POST /api/products`
- [ ] Create order referencing product: `POST /api/orders`
- [ ] Wait 10 seconds
- [ ] Query product sales: `GET /api/analytics/products/{id}/sales`
- [ ] Query category revenue: `GET /api/analytics/categories/{cat}/revenue`
- [ ] Query customer LTV: `GET /api/analytics/customers/{id}/lifetime-value`
- [ ] Check sync status: `GET /api/analytics/sync-status`
- [ ] Verify `lagSeconds` is reasonable (< 30s)
- [ ] Create second order for same customer
- [ ] Verify aggregations are cumulative

---

## Typical Test Flow (Copy-Paste Ready)

### Create Sample Data
```bash
# Product 1
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","category":"Electronics","price":50000,"stock":10}'

# Product 2
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Coffee Maker","category":"Home & Kitchen","price":5000,"stock":50}'

# Order 1
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":5,"items":[{"productId":1,"quantity":2,"price":50000}]}'

# Order 2
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":10,"items":[{"productId":2,"quantity":3,"price":5000},{"productId":1,"quantity":1,"price":50000}]}'
```

### Wait (important!)
```bash
sleep 10
```

### Query Analytics
```bash
# Product sales
curl http://localhost:8081/api/analytics/products/1/sales

# Category revenue
curl "http://localhost:8081/api/analytics/categories/Electronics/revenue"

# Customer LTV
curl http://localhost:8081/api/analytics/customers/5/lifetime-value

# Sync status
curl http://localhost:8081/api/analytics/sync-status
```

---

## Troubleshooting

### "Connection refused" errors
- Check services: `docker ps`
- Check logs: `docker logs <service>`
- Restart: `docker-compose restart`

### "Product not found" / "Customer not found"
- Create product first
- Use correct product ID
- Wait 10 seconds after creating orders

### High `lagSeconds` (> 60)
- Consumer may be processing slowly
- Check consumer logs: `docker logs ecommerce-cqrs-analytics-consumer-service-1`
- Verify: `docker ps` (consumer should be "Up")

### No data in analytics endpoints after waiting
- Check order was created: Query write database directly
- Check consumer is running: `docker logs consumer-service-1`
- Verify: Outbox table has events

---

## Additional Resources

- **Full Documentation**: See `README.md`
- **Testing Guide**: See `TESTING.md`
- **Postman Collection**: Import `postman-collection.json`
- **Architecture**: See `IMPLEMENTATION_SUMMARY.md`
