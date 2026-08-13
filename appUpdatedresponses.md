# Growlic Mobile App — Order API Response & Schema Migration Guide

**Document Target**: Mobile App & Client App Developers  
**Scope**: Complete Order Lifecycle APIs (Placing Orders, Fetching Live Orders, Accepting/Rejecting Orders with Audit Reasons, and Order History).  

> 💡 **TL;DR FOR APP DEVELOPERS**:
> - **Zero Breaking Changes**: All existing API endpoints, URLs, headers, and fields work exactly as before.
> - **No Mandatory Code Changes Required**: Your app can continue accepting/rejecting orders and viewing order history as-is.
> - **Optional New Fields Available**:
>   1. `orderType`: (`"dine_in"`, `"takeaway"`, or `"delivery"`).
>   2. `paymentMode`: (`"cash"` or `"online"`).
>   3. `rejectionReason`: (Pass an audit string when sending status `"cancelled"` on reject).

---

## 1. Unified `Order` Data Model Schema

Below is the complete updated `Order` JSON object returned by all Order endpoints:

```json
{
  "_id": "66bc123456789abcdef01234",
  "restaurantId": "growlic-demo",
  "customerName": "Faizan Sheikh",
  "customerPhone": "9541234068",
  "tableId": "3",
  "orderType": "dine_in",
  "paymentMode": "online",
  "items": [
    {
      "menuItemId": "6682f9d8f1b2c4c8d5d90111",
      "name": "Chicken Popcorn",
      "price": 98,
      "quantity": 2,
      "image": "/images/chicken-popcorn.jpg",
      "originatedFromNudge": false,
      "nudgeType": null,
      "nudgeRuleId": null
    }
  ],
  "subtotal": 196,
  "total": 196,
  "status": "cancelled",
  "notes": "Make it extra crispy please",
  "estimatedTime": 20,
  "actualPrepTimeMinutes": 28,
  "delayMinutes": 8,
  "isDelayed": true,
  "delayReason": "Kitchen Rush & Heavy Wok Load",
  "rejectionReason": "Item Out of Stock / Unavailable",
  "rejectedAt": "2026-08-12T07:15:00.000Z",
  "createdAt": "2026-08-12T07:00:00.000Z",
  "updatedAt": "2026-08-12T07:15:00.000Z"
}
```

### Complete Field Dictionary Table

| Field Name | Data Type | Allowed Values / Enum | Default | App Usage & Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `string` | MongoDB ObjectId string | Required | Unique order identifier. |
| `restaurantId` | `string` | Restaurant slug ID | Required | Restaurant tenant ID. |
| `customerName` | `string` | Any string | Required | Name of the customer placing order. |
| `customerPhone` | `string` | Any string | Required | Phone number of the customer. |
| `tableId` | `string` or `null` | Table number/string | `null` | Table identifier for dine-in orders. |
| `orderType` | `string` | `'dine_in'`, `'takeaway'`, `'delivery'` | `'takeaway'` | **NEW**: Fulfillment type (`🍽️ Dine In`, `🥡 Takeaway`, `🛵 Delivery`). |
| `paymentMode` | `string` | `'cash'`, `'online'` | `'cash'` | **NEW**: Payment mode selected (`💵 Cash` vs `💳 Online Payment`). |
| `status` | `string` | `'received'`, `'accepted'`, `'preparing'`, `'ready'`, `'completed'`, `'cancelled'` | `'received'` | Order lifecycle status. |
| `rejectionReason` | `string` | Any text string | `""` | **NEW**: Reason logged by restaurant when an order is cancelled/rejected. |
| `rejectedAt` | `string` or `null` | ISO 8601 Date string | `null` | **NEW**: ISO timestamp when order was rejected/cancelled. |
| `estimatedTime` | `number` | Positive integer (mins) | `0` | Promised preparation ETA in minutes. |
| `actualPrepTimeMinutes` | `number` | Positive integer (mins) | `0` | Actual elapsed prep duration in minutes. |
| `delayMinutes` | `number` | Positive integer (mins) | `0` | Delay duration beyond promised ETA. |
| `isDelayed` | `boolean` | `true`, `false` | `false` | Indicator if order exceeded promised ETA. |
| `delayReason` | `string` | Any text string | `""` | Kitchen delay note logged by staff. |
| `items` | `array` | Array of Item objects | `[]` | List of items ordered. |
| `subtotal` | `number` | Positive number | Required | Cart subtotal amount in ₹. |
| `total` | `number` | Positive number | Required | Final payable amount in ₹. |
| `notes` | `string` | Any text string | `""` | Customer notes for chef. |
| `createdAt` | `string` | ISO 8601 Date string | Required | Timestamp when order was placed. |

---

## 2. App API Endpoints Reference

### API 1: Create & Place Order (`POST /api/customer/orders`)

Used by the mobile app when a customer submits an order.

- **HTTP Method**: `POST`
- **Endpoint**: `/api/customer/orders`
- **Request Headers**:
  ```http
  Content-Type: application/json
  ```
- **Request Payload (JSON)**:
  ```json
  {
    "restaurantId": "growlic-demo",
    "customerName": "Faizan Sheikh",
    "customerPhone": "9541234068",
    "tableId": "3",
    "orderType": "dine_in",
    "paymentMode": "online",
    "items": [
      {
        "menuItemId": "6682f9d8f1b2c4c8d5d90111",
        "name": "Chicken Popcorn",
        "price": 98,
        "quantity": 2,
        "image": "/images/chicken-popcorn.jpg"
      }
    ],
    "subtotal": 196,
    "total": 196,
    "notes": "Make it extra crispy please"
  }
  ```
- **Expected Response Payload (JSON - Status 200 OK)**:
  ```json
  {
    "success": true,
    "order": {
      "_id": "66bc123456789abcdef01234",
      "restaurantId": "growlic-demo",
      "customerName": "Faizan Sheikh",
      "customerPhone": "9541234068",
      "tableId": "3",
      "orderType": "dine_in",
      "paymentMode": "online",
      "items": [
        {
          "menuItemId": "6682f9d8f1b2c4c8d5d90111",
          "name": "Chicken Popcorn",
          "price": 98,
          "quantity": 2,
          "image": "/images/chicken-popcorn.jpg"
        }
      ],
      "subtotal": 196,
      "total": 196,
      "status": "received",
      "notes": "Make it extra crispy please",
      "estimatedTime": 0,
      "actualPrepTimeMinutes": 0,
      "delayMinutes": 0,
      "isDelayed": false,
      "delayReason": "",
      "rejectionReason": "",
      "rejectedAt": null,
      "createdAt": "2026-08-12T07:00:00.000Z",
      "updatedAt": "2026-08-12T07:00:00.000Z"
    }
  }
  ```

---

### API 2: Fetch Admin Live Orders (`GET /api/admin/orders`)

Used by the admin/staff app to view incoming, active, delayed, or completed orders.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/admin/orders?status=all&limit=50&skip=0`
- **Request Headers**:
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```
- **Query Parameters**:
  - `status`: Optional filter (`'received'`, `'accepted'`, `'preparing'`, `'ready'`, `'completed'`, `'cancelled'`, `'delayed'`, `'all'`).
  - `limit`: Number of records (default `50`).
  - `skip`: Pagination offset (default `0`).

- **Expected Response Payload (JSON - Status 200 OK)**:
  ```json
  {
    "success": true,
    "orders": [
      {
        "_id": "66bc123456789abcdef01234",
        "restaurantId": "growlic-demo",
        "customerName": "Faizan Sheikh",
        "customerPhone": "9541234068",
        "tableId": "3",
        "orderType": "dine_in",
        "paymentMode": "online",
        "items": [
          {
            "menuItemId": "6682f9d8f1b2c4c8d5d90111",
            "name": "Chicken Popcorn",
            "price": 98,
            "quantity": 2
          }
        ],
        "subtotal": 196,
        "total": 196,
        "status": "cancelled",
        "estimatedTime": 20,
        "actualPrepTimeMinutes": 28,
        "delayMinutes": 8,
        "isDelayed": true,
        "delayReason": "Kitchen Rush & Heavy Wok Load",
        "rejectionReason": "Item Out of Stock / Unavailable",
        "rejectedAt": "2026-08-12T07:15:00.000Z",
        "createdAt": "2026-08-12T07:00:00.000Z",
        "updatedAt": "2026-08-12T07:15:00.000Z"
      }
    ],
    "totalCount": 1
  }
  ```

---

### API 3: Accept, Update ETA, or Reject Order (`PATCH /api/admin/orders/:id`)

Used by staff to accept an order, update estimated prep time, or reject an order with an audit reason.

- **HTTP Method**: `PATCH`
- **Endpoint**: `/api/admin/orders/66bc123456789abcdef01234`
- **Request Headers**:
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  Content-Type: application/json
  ```

#### Scenario A: Accept Order & Set ETA
```json
{
  "status": "accepted",
  "estimatedTime": 20
}
```

#### Scenario B: Reject Order with Internal Audit Reason
```json
{
  "status": "cancelled",
  "rejectionReason": "Item Out of Stock / Unavailable"
}
```

- **Expected Response Payload (JSON - Status 200 OK)**:
  ```json
  {
    "success": true,
    "order": {
      "_id": "66bc123456789abcdef01234",
      "restaurantId": "growlic-demo",
      "customerName": "Faizan Sheikh",
      "customerPhone": "9541234068",
      "status": "cancelled",
      "rejectionReason": "Item Out of Stock / Unavailable",
      "rejectedAt": "2026-08-12T07:15:00.000Z",
      "updatedAt": "2026-08-12T07:15:00.000Z"
    }
  }
  ```

---

### API 4: Customer Order History & Tracking (`GET /api/customer/orders`)

Used by the customer app to view past orders or track a specific order.

- **HTTP Method**: `GET`
- **Endpoint**: `/api/customer/orders?phone=9541234068&restaurantId=growlic-demo`
- **Expected Response Payload (JSON - Status 200 OK)**:
  ```json
  {
    "success": true,
    "orders": [
      {
        "_id": "66bc123456789abcdef01234",
        "restaurantId": "growlic-demo",
        "customerName": "Faizan Sheikh",
        "customerPhone": "9541234068",
        "tableId": "3",
        "orderType": "dine_in",
        "paymentMode": "online",
        "items": [
          {
            "menuItemId": "6682f9d8f1b2c4c8d5d90111",
            "name": "Chicken Popcorn",
            "price": 98,
            "quantity": 2
          }
        ],
        "subtotal": 196,
        "total": 196,
        "status": "cancelled",
        "rejectionReason": "Item Out of Stock / Unavailable",
        "rejectedAt": "2026-08-12T07:15:00.000Z",
        "createdAt": "2026-08-12T07:00:00.000Z"
      }
    ]
  }
  ```

---

## 3. Mobile App Integration Guidelines

### A. TypeScript Interface for Mobile App Models

```typescript
export interface AppOrder {
  _id: string;
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  tableId?: string | null;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  paymentMode?: 'cash' | 'online';
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  subtotal: number;
  total: number;
  status: 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes?: string;
  estimatedTime?: number;
  actualPrepTimeMinutes?: number;
  delayMinutes?: number;
  isDelayed?: boolean;
  delayReason?: string;
  rejectionReason?: string; // Rendered when order is cancelled
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}
```

### B. Safe UI Helper Functions for Mobile App

```typescript
// Helper 1: Format Order Type Label for Badges
export function getOrderTypeLabel(order: AppOrder): string {
  const isDineIn = order.orderType === 'dine_in' || (order.tableId && !order.tableId.toLowerCase().includes('takeaway'));
  const isDelivery = order.orderType === 'delivery';

  if (isDineIn) {
    return order.tableId ? `🍽️ Dine In (Table ${order.tableId})` : '🍽️ Dine In (At table)';
  } else if (isDelivery) {
    return '🛵 Delivery (Home delivery)';
  } else {
    return '🥡 Takeaway (Self pickup)';
  }
}

// Helper 2: Format Payment Method Label for Badges
export function getPaymentModeLabel(paymentMode?: string): string {
  return paymentMode === 'online' ? '💳 Online Payment' : '💵 Cash';
}

// Helper 3: Format Customer Cancellation Banner
export function getCancellationReasonText(order: AppOrder): string {
  if (order.status !== 'cancelled') return '';
  return order.rejectionReason && order.rejectionReason.trim().length > 0
    ? `Reason: ${order.rejectionReason}`
    : 'This order was cancelled by the restaurant.';
}
```
