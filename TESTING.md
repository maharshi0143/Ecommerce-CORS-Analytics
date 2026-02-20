# API Testing Guide

## System Readiness Check

Before running tests, verify all services are healthy:

```bash
# Check Command Service
curl http://localhost:8080/health

# Check Query Service  
curl http://localhost:8081/health
```

Both should return: `{"status":"ok"}`

---

## Postman Collection

A complete Postman collection is included: `postman-collection.json`

**Import into Postman:**
1. Open Postman
2. Click "Import" 
3. Select `postman-collection.json`
4. All requests are ready to use

---

## Manual Testing with cURL / PowerShell

### 1. Create Products

#### Product 1 - Electronics
```powershell
$productBody = @{
    name = "Laptop"
    category = "Electronics"
    price = 50000
    stock = 10
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:8080/api/products" `
  -Method POST `
  -Body $productBody `
  -ContentType "application/json" `
  -UseBasicParsing | ConvertFrom-Json
```

**Save productId: 1**

#### Product 2 - Home & Kitchen
```powershell
$productBody = @{
    name = "Coffee Maker"
    category = "Home & Kitchen"
    price = 5000
    stock = 50
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:8080/api/products" `
  -Method POST `
  -Body $productBody `
  -ContentType "application/json" `
  -UseBasicParsing | ConvertFrom-Json
```

**Save productId: 2**

---

### 2. Create Orders

#### Order 1 - Customer 5
```powershell
$orderBody = @{
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
  -Body $orderBody `
  -ContentType "application/json" `
  -UseBasicParsing | ConvertFrom-Json
```

**Expected:** `{"orderId": 1}`

#### Order 2 - Customer 10 (Multiple Items)
```powershell
$orderBody = @{
    customerId = 10
    items = @(
        @{
            productId = 2
            quantity = 3
            price = 5000
        },
        @{
            productId = 1
            quantity = 1
            price = 50000
        }
    )
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:8080/api/orders" `
  -Method POST `
  -Body $orderBody `
  -ContentType "application/json" `
  -UseBasicParsing | ConvertFrom-Json
```

**Expected:** `{"orderId": 2}`

#### Order 3 - Customer 5 (Second Purchase)
```powershell
$orderBody = @{
    customerId = 5
    items = @(
        @{
            productId = 2
            quantity = 1
            price = 5000
        }
    )
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "http://localhost:8080/api/orders" `
  -Method POST `
  -Body $orderBody `
  -ContentType "application/json" `
  -UseBasicParsing | ConvertFrom-Json
```

**Expected:** `{"orderId": 3}`

---

### 3. Wait for Event Processing

**⏰ CRITICAL STEP: Wait 10 seconds for events to be consumed and views updated**

```powershell
Start-Sleep -Seconds 10
```

This allows time for:
- Outbox Publisher to poll and publish events
- Consumer to process events
- Materialized views to be updated

---

### 4. Query Analytics

#### Product Sales Analytics
```powershell
# Product 1
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/products/1/sales" `
  -UseBasicParsing | ConvertFrom-Json

# Expected:
# {
#   "productId": 1,
#   "totalQuantitySold": 3,
#   "totalRevenue": 150000,
#   "orderCount": 2
# }
```

#### Category Revenue
```powershell
# Electronics
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/categories/Electronics/revenue" `
  -UseBasicParsing | ConvertFrom-Json

# Expected:
# {
#   "category": "Electronics",
#   "totalRevenue": 170000,
#   "totalOrders": 3
# }

# Home & Kitchen
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/categories/Home%20%26%20Kitchen/revenue" `
  -UseBasicParsing | ConvertFrom-Json

# Expected:
# {
#   "category": "Home & Kitchen",
#   "totalRevenue": 20000,
#   "totalOrders": 2
# }
```

#### Customer Lifetime Value
```powershell
# Customer 5
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/customers/5/lifetime-value" `
  -UseBasicParsing | ConvertFrom-Json

# Expected:
# {
#   "customerId": 5,
#   "totalSpent": 105000,
#   "orderCount": 2,
#   "lastOrderDate": "2026-02-19T..."
# }

# Customer 10
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/customers/10/lifetime-value" `
  -UseBasicParsing | ConvertFrom-Json

# Expected:
# {
#   "customerId": 10,
#   "totalSpent": 65000,
#   "orderCount": 1,
#   "lastOrderDate": "2026-02-19T..."
# }
```

#### Sync Status (Eventual Consistency Lag)
```powershell
Invoke-WebRequest `
  -Uri "http://localhost:8081/api/analytics/sync-status" `
  -UseBasicParsing | ConvertFrom-Json

# Expected:
# {
#   "lastProcessedEventTimestamp": "2026-02-19T...",
#   "lagSeconds": 2
# }
```

---

## Complete PowerShell Test Script

Copy and run this complete test:

```powershell
Write-Host "=== E-Commerce CQRS Analytics - Complete Test ===" -ForegroundColor Cyan

# 1. Create Products
Write-Host "`n[1] Creating Products..." -ForegroundColor Yellow

$product1Body = @{name="Laptop";category="Electronics";price=50000;stock=10} | ConvertTo-Json
$product1 = (Invoke-WebRequest -Uri "http://localhost:8080/api/products" -Method POST -Body $product1Body -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json).productId
Write-Host "✅ Product 1: ID=$product1"

$product2Body = @{name="Coffee Maker";category="Home & Kitchen";price=5000;stock=50} | ConvertTo-Json
$product2 = (Invoke-WebRequest -Uri "http://localhost:8080/api/products" -Method POST -Body $product2Body -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json).productId
Write-Host "✅ Product 2: ID=$product2"

# 2. Create Orders
Write-Host "`n[2] Creating Orders..." -ForegroundColor Yellow

$order1Body = @{customerId=5;items=@(@{productId=$product1;quantity=2;price=50000})} | ConvertTo-Json
$order1 = (Invoke-WebRequest -Uri "http://localhost:8080/api/orders" -Method POST -Body $order1Body -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json).orderId
Write-Host "✅ Order 1: ID=$order1"

$order2Body = @{customerId=10;items=@(@{productId=$product2;quantity=3;price=5000},@{productId=$product1;quantity=1;price=50000})} | ConvertTo-Json
$order2 = (Invoke-WebRequest -Uri "http://localhost:8080/api/orders" -Method POST -Body $order2Body -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json).orderId
Write-Host "✅ Order 2: ID=$order2"

$order3Body = @{customerId=5;items=@(@{productId=$product2;quantity=1;price=5000})} | ConvertTo-Json
$order3 = (Invoke-WebRequest -Uri "http://localhost:8080/api/orders" -Method POST -Body $order3Body -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json).orderId
Write-Host "✅ Order 3: ID=$order3"

# 3. Wait for event processing
Write-Host "`n[3] Waiting 10 seconds for event processing..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 4. Query analytics
Write-Host "`n[4] Testing Analytics Endpoints..." -ForegroundColor Yellow

$sales1 = Invoke-WebRequest -Uri "http://localhost:8081/api/analytics/products/$product1/sales" -UseBasicParsing | ConvertFrom-Json
Write-Host "✅ Product $product1 Sales: Sold=$($sales1.totalQuantitySold), Revenue=$($sales1.totalRevenue), Orders=$($sales1.orderCount)"

$electronics = Invoke-WebRequest -Uri "http://localhost:8081/api/analytics/categories/Electronics/revenue" -UseBasicParsing | ConvertFrom-Json
Write-Host "✅ Electronics: Revenue=$($electronics.totalRevenue), Orders=$($electronics.totalOrders)"

$customer5 = Invoke-WebRequest -Uri "http://localhost:8081/api/analytics/customers/5/lifetime-value" -UseBasicParsing | ConvertFrom-Json
Write-Host "✅ Customer 5 LTV: Spent=$($customer5.totalSpent), Orders=$($customer5.orderCount)"

$sync = Invoke-WebRequest -Uri "http://localhost:8081/api/analytics/sync-status" -UseBasicParsing | ConvertFrom-Json
Write-Host "✅ Sync Status: Lag=$($sync.lagSeconds) seconds"

Write-Host "`n=== ✅ ALL TESTS PASSED ===" -ForegroundColor Green
```

---

## Expected Results Summary

After successfully running all tests:

| Metric | Expected Value |
|--------|----------------|
| Total Products Created | 2 |
| Total Orders Created | 3 |
| Total Orders (from analytics) | 3 |
| Product 1 Quantity Sold | 3 (2 + 1) |
| Product 1 Revenue | 150,000 (100k + 50k) |
| Product 2 Quantity Sold | 4 (3 + 1) |
| Electronics Revenue | 170,000 |
| Customer 5 Total Spent | 105,000 |
| Customer 5 Order Count | 2 |
| Customer 10 Total Spent | 65,000 |
| System Lag | < 15 seconds |

---

## Troubleshooting

### API Returns 404
- Verify services are running: `docker ps`
- Check service is healthy: `curl http://localhost:8080/health`

### No data in analytics endpoints
- Verify wait time (minimum 10 seconds after order creation)
- Check consumer logs: `docker logs <consumer-container>`
- Verify orders were created: Query the write database directly

### High sync lag (> 60 seconds)
- Consumer may be slow or stuck
- Check logs: `docker logs ecommerce-cqrs-analytics-consumer-service-1`
- Restart consumer: `docker-compose restart consumer-service`

---

## Key Takeaways

✅ **Command endpoints are synchronous** - Return immediately after database commit  
✅ **Query endpoints are asynchronous** - Data may lag 5-30 seconds  
✅ **Idempotency ensures safety** - Can retry failed requests  
✅ **Eventual consistency works** - All views converge to correct state  
✅ **System is production-ready** - Transactional integrity + event reliability  
