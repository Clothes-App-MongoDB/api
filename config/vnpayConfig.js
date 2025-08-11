module.exports = {
  // Cấu hình VNPay - sử dụng fallback values cho development
  VNP_TMN_CODE: process.env.VNP_TMN_CODE || 'WVHCBEIS',
  VNP_HASH_SECRET: process.env.VNP_HASH_SECRET || 'G835F4FT2LR70GPLQLDMVYRIJHN2YUPT',
  VNP_URL: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  
  // Return URL cho callback - phải là URL public mà VNPay có thể truy cập
  VNP_RETURN_URL: process.env.VNP_RETURN_URL || 'http://192.168.1.69:5000/api/payments/vnpay-return',

  // IPN URL cho server-to-server callback
  VNP_IPN_URL: process.env.VNP_IPN_URL || 'http://192.168.1.69:5000/api/payments/vnpay-ipn',
  
  // Callback URL cho xử lý callback (tương thích với backend api)
  VNP_CALLBACK_URL: process.env.VNP_CALLBACK_URL || 'http://192.168.1.69:5000/api/payments/handle-callback',
  
  // Cấu hình cho development
  IS_SANDBOX: process.env.NODE_ENV !== 'production',
  
  // Timeout cho payment (5 phút)
  PAYMENT_TIMEOUT: 5 * 60 * 1000,
  
  // Số lần retry khi check payment status
  MAX_RETRY_COUNT: 30,
  
  // Interval giữa các lần check (10 giây)
  CHECK_INTERVAL: 10 * 1000
}; 