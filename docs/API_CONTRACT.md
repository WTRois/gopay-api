# API Contract — GoPay Merchant Gateway

> Baseline API specification extracted from `server.js` implementation.
> All refactored versions MUST preserve these contracts for backward compatibility.

---

## 1. Authentication

Protected endpoints accept authentication via:
1. **Header (Preferred)**: `x-api-key: <API_KEY>`
2. **Query Parameter (Legacy/Deprecated)**: `?api_key=<API_KEY>`

If missing or invalid:
- **Status**: `401 Unauthorized`
- **Body**:

  ```json
  {
    "status": false,
    "message": "API Key tidak valid atau tidak disertakan!"
  }
  ```

---

## 2. Endpoints Specification

### 2.1 Public Health Endpoints

#### `GET /`

- **Auth**: None
- **Response**: `200 OK` (Content-Type: `text/plain`)
- **Body**:

  ```
  GoPay Partner API Gateway Berjalan
  ```

#### `GET /health`

- **Auth**: None
- **Response**: `200 OK` (Content-Type: `application/json`)
- **Body**:

  ```json
  {
    "status": "OK",
    "service": "GoPay Partner API Gateway",
    "timestamp": "2026-10-22T10:00:00.000Z"
  }
  ```

#### `GET /api/health`

- **Auth**: None
- **Response**: `200 OK` (Content-Type: `application/json`)
- **Body**:

  ```json
  {
    "success": true,
    "message": "Layanan API GoPay Berfungsi Normal",
    "timestamp": "2026-10-22T10:00:00.000Z"
  }
  ```

---

### 2.2 Token & Session Status

#### `GET /token-status`

- **Auth**: Required (`x-api-key` or `?api_key`)
- **Response**:
  - `200 OK` (Session valid):

    ```json
    {
      "status": true,
      "message": "Token / Sesi AKTIF dan VALID",
      "data": {
        "expired": false,
        "expires_in_minutes": 120,
        "token_type": "merchant_token"
      }
    }
    ```
  - `401 Unauthorized` or `500 Internal Server Error` (Session missing/expired):

    ```json
    {
      "status": false,
      "message": "Sesi tidak ditemukan atau kedaluwarsa. Silakan login ulang via terminal."
    }
    ```

---

### 2.3 QRIS Generation & Checkout

#### `ALL /create-qris` (GET & POST)

- **Auth**: Required
- **Parameters** (Query string for GET, JSON body for POST):
  - `nominal` or `amount` (_number|string_, required): Payment amount in IDR.
- **Validation**:
  - Must be a valid positive integer > 0.
  - Base `QRIS_STATIC` must be configured in environment.
- **Success Response**: `200 OK`

  ```json
  {
    "status": true,
    "message": "QRIS Dinamis berhasil dibuat",
    "data": {
      "qris_id": "1729580000000",
      "trx_id": "TRX-1729580000000-1234",
      "nominal": 15000,
      "qris_content": "00020101021226...540515000...6304ABCD",
      "checkout_url": "http://localhost:3000/qr/1729580000000",
      "expires_at": 1729580300000,
      "expires_in_seconds": 300
    }
  }
  ```
- **Error Response**: `400 Bad Request`

  ```json
  {
    "status": false,
    "message": "Nominal pembayaran wajib diisi dan harus berupa angka positif lebih dari 0!"
  }
  ```

#### `GET /qr/:id`

- **Auth**: None (Public customer checkout page)
- **Parameters**: `id` in route path (`qris_id`)
- **Response**:
  - `200 OK` (HTML) if active or recently settled
  - `404 Not Found` (HTML/Text) if QRIS not found or expired

#### `GET /api/qr-status/:id`

- **Auth**: None (Polled by customer checkout page)
- **Parameters**: `id` in route path
- **Response**:
  - `200 OK` (Pending):

    ```json
    {
      "status": "PENDING",
      "qris_id": "1729580000000",
      "nominal": 15000,
      "expires_at": 1729580300000,
      "remaining_seconds": 240
    }
    ```
  - `200 OK` (Paid):

    ```json
    {
      "status": "PAID",
      "qris_id": "1729580000000",
      "nominal": 15000,
      "paid_at": 1729580050000,
      "settlement_time": "2026-10-22T10:00:50.000Z",
      "transaction": {
        "id": "12345678",
        "order_id": "GOPAY-...",
        "amount": 15000
      }
    }
    ```
  - `200 OK` (Expired):

    ```json
    {
      "status": "EXPIRED",
      "qris_id": "1729580000000",
      "message": "QRIS telah kedaluwarsa"
    }
    ```
  - `404 Not Found`:

    ```json
    {
      "status": "NOT_FOUND",
      "message": "QRIS ID tidak ditemukan"
    }
    ```

---

### 2.4 Manual Payment Verification

#### `ALL /check-payment` (GET & POST)

- **Auth**: Required
- **Parameters** (Query string or JSON body):
  - `nominal` (_number|string_, required)
  - `trx_id` (_string_, optional): Specific transaction identifier to scope matching
- **Success Response**: `200 OK`

  ```json
  {
    "status": true,
    "paid": true,
    "message": "Pembayaran ditemukan dan terverifikasi!",
    "data": {
      "transaction_id": "12345678",
      "amount": 15000,
      "status": "SETTLEMENT",
      "settlement_time": "2026-10-22T10:00:50.000Z"
    }
  }
  ```
- **Not Found / Unpaid**: `200 OK`

  ```json
  {
    "status": true,
    "paid": false,
    "message": "Belum ada pembayaran yang cocok untuk nominal Rp 15.000"
  }
  ```

---

### 2.5 Transactions & Logs

#### `GET /transactions`

- **Auth**: Required
- **Query Parameters**:
  - `page` (_integer_, optional, default: 1)
  - `pageSize` (_integer_, optional, default: 20)
  - `startDate` (_string_, optional, default: today - 7 days)
  - `endDate` (_string_, optional, default: today)
- **Response**: `200 OK`

  ```json
  {
    "status": true,
    "data": {
      "transactions": [ ... ],
      "meta": { "page": 1, "pageSize": 20, "total": 1 }
    }
  }
  ```

#### `GET /transactions/all`

- **Auth**: Required
- **Description**: Fetches all transactions for current month with pagination loop.
- **Response**: `200 OK`

  ```json
  {
    "status": true,
    "data": {
      "transactions": [ ... ],
      "total": 42
    }
  }
  ```

#### `GET /api/logs`

- **Auth**: Required
- **Response**: `200 OK`

  ```json
  {
    "status": true,
    "logs": [
      {
        "id": 1729580000000,
        "timestamp": "2026-10-22T10:00:00.000Z",
        "type": "INFO",
        "message": "Server started",
        "details": null
      }
    ]
  }
  ```
