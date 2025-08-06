# 🚀 Tích Hợp VNPay vào MazonePoly_Server

## 📋 Tổng Quan

Đã tích hợp thành công hệ thống thanh toán VNPay vào MazonePoly_Server với đầy đủ các tính năng:
- ✅ Tạo đơn hàng VNPay
- ✅ Tạo URL thanh toán VNPay
- ✅ Xử lý callback từ VNPay
- ✅ Xác thực thanh toán
- ✅ Kiểm tra trạng thái thanh toán

## 🛠️ Cài Đặt

### 1. Cài đặt dependencies
```bash
npm install moment qs
```

### 2. Cấu hình Environment Variables
Thêm vào file `.env`:
```env
# VNPay Configuration
VNP_TMN_CODE=WVHCBEIS
VNP_HASH_SECRET=G835F4FT2LR70GPLQLDMVYRIJHN2YUPT
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:3000/api/payments/vnpay-return
VNP_IPN_URL=http://localhost:3000/api/payments/vnpay-ipn
```

## 📁 Cấu Trúc Files Đã Tạo

```
MazonePoly_Server/
├── models/
│   └── Payment.js              # Model Payment cho MongoDB
├── config/
│   └── vnpayConfig.js          # Cấu hình VNPay
├── services/
│   └── vnpay.service.js        # Service xử lý logic VNPay
├── controllers/
│   └── payment.controller.js   # Controller xử lý payment
├── routes/
│   └── payment.routes.js       # Routes cho payment
└── VNPAY_INTEGRATION.md        # File hướng dẫn này
```

## 🔧 API Endpoints

### 1. Tạo đơn hàng VNPay
```http
POST /api/orders/vnpay-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "name": "Áo thun nam",
      "image": "/uploads/ao_thun.jpg",
      "color": "Trắng",
      "size": "M",
      "quantity": 2,
      "price": 299000
    }
  ],
  "address": {
    "full_name": "Nguyễn Văn A",
    "phone_number": "0123456789",
    "province": "Hà Nội",
    "district": "Cầu Giấy",
    "ward": "Dịch Vọng",
    "street": "123 Đường ABC"
  },
  "shipping_fee": 12500,
  "total_amount": 610500
}
```

### 2. Tạo URL thanh toán VNPay
```http
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "amount": 610500,
  "orderInfo": "Thanh toan don hang #64f8a1b2c3d4e5f6a7b8c9d0",
  "userId": "64f8a1b2c3d4e5f6a7b8c9d1"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "vnpTxnRef": "143022",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
}
```

### 3. Kiểm tra trạng thái thanh toán
```http
GET /api/payments/status/:orderId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "orderId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "amount": 610500,
    "status": "completed",
    "paymentType": "VNPay",
    "transactionRef": "143022",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "paymentDate": "2024-01-15T10:35:00.000Z"
  }
}
```

### 4. Xác thực thanh toán
```http
GET /api/payments/verify?vnp_ResponseCode=00&vnp_TxnRef=143022&...
```

## 🔄 Quy Trình Thanh Toán

### Bước 1: Tạo đơn hàng VNPay
```javascript
// Frontend gọi API tạo đơn hàng
const orderResponse = await fetch('/api/orders/vnpay-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(orderData)
});

const order = await orderResponse.json();
```

### Bước 2: Tạo URL thanh toán
```javascript
// Frontend gọi API tạo URL thanh toán
const paymentResponse = await fetch('/api/payments/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: order._id,
    amount: order.total_amount,
    orderInfo: `Thanh toan don hang #${order._id}`,
    userId: user.id
  })
});

const paymentData = await paymentResponse.json();
```

### Bước 3: Chuyển hướng đến VNPay
```javascript
// Frontend chuyển hướng user đến trang thanh toán VNPay
window.location.href = paymentData.paymentUrl;
```

### Bước 4: Xử lý callback
- VNPay sẽ callback về `/api/payments/vnpay-return`
- Hệ thống tự động cập nhật trạng thái đơn hàng
- User được chuyển hướng về trang kết quả

## 📊 Database Schema

### Payment Collection
```javascript
{
  _id: ObjectId,
  order_id: ObjectId,        // Reference to Order
  user_id: ObjectId,         // Reference to User
  amount: Number,            // Số tiền thanh toán
  paymentType: String,       // "VNPay"
  status: String,            // "pending" | "completed" | "failed" | "cancelled"
  transactionRef: String,    // VNPay transaction reference
  responseData: Object,      // Response data from VNPay
  paymentDate: Date,         // Ngày thanh toán
  createdAt: Date,
  updatedAt: Date
}
```

### Order Collection (Updated)
```javascript
{
  // ... existing fields
  payment_method: String,    // "cash" | "momo" | "vnpay"
  payment_info: {
    transaction_id: String,  // VNPay transaction ID
    pay_type: String,        // Payment type
    momo_response: Object    // MoMo response data
  }
}
```

## 🔒 Bảo Mật

- ✅ HMAC-SHA512 signature verification
- ✅ IPN validation cho server-to-server callback
- ✅ Token authentication cho API endpoints
- ✅ Input validation và sanitization

## 🚨 Lưu Ý Quan Trọng

1. **Sandbox vs Production**: Hiện tại đang dùng sandbox VNPay, khi deploy production cần thay đổi URL và credentials
2. **Return URL**: Phải là URL public mà VNPay có thể truy cập được
3. **IPN URL**: Cần cấu hình để VNPay có thể gọi về server
4. **Error Handling**: Đã implement đầy đủ error handling cho các trường hợp lỗi

## 🧪 Testing

### Test với Postman:

1. **Tạo đơn hàng VNPay:**
   - Method: POST
   - URL: `http://localhost:3000/api/orders/vnpay-order`
   - Headers: `Authorization: Bearer <token>`
   - Body: JSON với order data

2. **Tạo URL thanh toán:**
   - Method: POST
   - URL: `http://localhost:3000/api/payments/create`
   - Headers: `Authorization: Bearer <token>`
   - Body: JSON với payment data

3. **Kiểm tra trạng thái:**
   - Method: GET
   - URL: `http://localhost:3000/api/payments/status/:orderId`
   - Headers: `Authorization: Bearer <token>`

## 🎯 Kết Luận

Hệ thống VNPay đã được tích hợp thành công vào MazonePoly_Server với đầy đủ tính năng cần thiết. Không cần notification hay socket, tập trung vào core payment functionality. 