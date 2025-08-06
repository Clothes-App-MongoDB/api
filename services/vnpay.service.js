const crypto = require('crypto');
const moment = require('moment');
const querystring = require('qs');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const vnpayConfig = require('../config/vnpayConfig');

class VNPayService {
  constructor() {
    // Validate config values
    if (!vnpayConfig.VNP_TMN_CODE) {
      throw new Error('VNP_TMN_CODE is not configured');
    }
    if (!vnpayConfig.VNP_HASH_SECRET) {
      throw new Error('VNP_HASH_SECRET is not configured');
    }
    if (!vnpayConfig.VNP_URL) {
      throw new Error('VNP_URL is not configured');
    }
    if (!vnpayConfig.VNP_RETURN_URL) {
      throw new Error('VNP_RETURN_URL is not configured');
    }

    this.vnp_TmnCode = vnpayConfig.VNP_TMN_CODE;
    this.vnp_HashSecret = vnpayConfig.VNP_HASH_SECRET;
    this.vnp_Url = vnpayConfig.VNP_URL;
    this.vnp_ReturnUrl = vnpayConfig.VNP_RETURN_URL;
    this.vnp_IpnUrl = vnpayConfig.VNP_IPN_URL;
    this.vnp_CallbackUrl = vnpayConfig.VNP_CALLBACK_URL;
  }

  createPaymentUrl = async (paymentData) => {
    console.log('DEBUG paymentData serice:', paymentData);
    try {
      const { 
        order_id, 
        total, 
        ipAddr,
        orderInfo,
        orderType = 'billpayment',
        bankCode = '',
        language = 'vn'
      } = paymentData;

      // Validate required parameters
      if (!order_id || !total) {
        throw new Error('order_id and total are required');
      }

      // Tạo payment record
      const payment = await Payment.create({
        order_id,
        user_id: paymentData.user_id,
        amount: total,
        paymentType: 'VNPay',
        status: 'pending'
      });

      const tmnCode = this.vnp_TmnCode;
      const secretKey = this.vnp_HashSecret;
      let vnpUrl = this.vnp_Url;
      const returnUrl = this.vnp_ReturnUrl;

      // Sử dụng order ID thật cho TxnRef như backend api
      const vnpTxnRef = `VNP${order_id}${moment().format("HHmmss")}`;
      const createDate = moment().format('YYYYMMDDHHmmss');
      const expireDate = moment().add(15, "minutes").format("YYYYMMDDHHmmss");
      const amount = total * 100; // Convert to smallest currency unit
      const currCode = 'VND';
      let vnp_Params = {};

      // Sửa IP Address - chỉ lấy IPv4, không dùng IPv6
      let cleanIpAddr = ipAddr;
      if (ipAddr && ipAddr.includes('::ffff:')) {
        cleanIpAddr = ipAddr.replace('::ffff:', '');
      }
      if (!cleanIpAddr || cleanIpAddr === '') {
        cleanIpAddr = '127.0.0.1'; // Fallback IP
      }

      console.log('🌐 Original IP:', ipAddr);
      console.log('🌐 Cleaned IP:', cleanIpAddr);

      vnp_Params['vnp_Version'] = '2.1.0';
      vnp_Params['vnp_Command'] = 'pay';
      vnp_Params['vnp_TmnCode'] = tmnCode;
      vnp_Params['vnp_Locale'] = language;
      vnp_Params['vnp_CurrCode'] = currCode;
      vnp_Params['vnp_TxnRef'] = vnpTxnRef;
      vnp_Params['vnp_OrderInfo'] = orderInfo;
      vnp_Params['vnp_OrderType'] = orderType;
      vnp_Params['vnp_Amount'] = amount;
      vnp_Params['vnp_ReturnUrl'] = `${returnUrl}?orderId=${order_id}`;
      vnp_Params['vnp_IpAddr'] = cleanIpAddr;
      vnp_Params['vnp_CreateDate'] = createDate;
      vnp_Params['vnp_ExpireDate'] = expireDate;
      // ❌ XÓA vnp_IpnUrl để giống backend api
      
      if (bankCode !== null && bankCode !== '') {
        vnp_Params['vnp_BankCode'] = bankCode;
      }

      console.log('📋 VNPay Config:');
      console.log('  - TMN Code:', tmnCode);
      console.log('  - Return URL:', returnUrl);
      console.log('  - Is Sandbox:', vnpayConfig.IS_SANDBOX);

      // Sắp xếp tham số theo alphabet và encode như backend api
      const sortedParams = this.sortObject(vnp_Params);

      // Tạo chuỗi ký - KHÔNG ENCODE
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', secretKey);
      const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

      console.log('🔐 Sign Data:', signData);
      console.log('🔐 Secure Hash:', secureHash);

      // Gắn chữ ký vào params
      sortedParams.vnp_SecureHash = secureHash;

      // Tạo URL THANH TOÁN - NHỚ ENCODE = FALSE ở đây
      const paymentUrl = `${vnpUrl}?${querystring.stringify(sortedParams, { encode: false })}`;

      console.log('🔗 VNPay URL created:', paymentUrl);
      console.log('🔑 VNPay Params:', sortedParams);

      // Cập nhật payment record với transaction reference
      await Payment.findByIdAndUpdate(payment._id, {
        transactionRef: vnpTxnRef,
        responseData: {
          vnp_TxnRef: vnpTxnRef,
          vnp_CreateDate: createDate,
          order_id: order_id,
          ipAddr: cleanIpAddr,
          config: {
            tmnCode,
            returnUrl,
            isSandbox: vnpayConfig.IS_SANDBOX
          }
        }
      });

      return {
        success: true,
        orderId: order_id,
        vnpTxnRef: vnpTxnRef,
        paymentUrl: paymentUrl
      };
    } catch (error) {
      console.error('Error creating payment URL:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  verifyReturnUrl = (vnpParams) => {
    try {
      const secureHash = vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHash'];
      delete vnpParams['vnp_SecureHashType'];

      // ⚠️ Bỏ qua signature verification trong test environment như backend api
      const isTestEnvironment = process.env.NODE_ENV !== 'production';
      if (isTestEnvironment) {
        console.log('🧪 Test environment - skipping signature verification');
        return {
          isValid: true,
          isSuccessful: vnpParams['vnp_ResponseCode'] === '00',
          message: vnpParams['vnp_ResponseCode'] === '00' ? 'Transaction successful' : 'Transaction failed'
        };
      }

      const sortedParams = this.sortObject(vnpParams);
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

      const isValid = secureHash === signed;
      const isSuccessful = vnpParams['vnp_ResponseCode'] === '00';

      return {
        isValid,
        isSuccessful,
        message: isValid 
          ? (isSuccessful ? 'Transaction successful' : 'Transaction failed')
          : 'Invalid signature'
      };
    } catch (error) {
      console.error('Error verifying return URL:', error);
      return {
        isValid: false,
        isSuccessful: false,
        message: 'Error verifying payment'
      };
    }
  }

  processIpn = (ipnData) => {
    try {
      const secureHash = ipnData['vnp_SecureHash'];
      delete ipnData['vnp_SecureHash'];
      delete ipnData['vnp_SecureHashType'];

      // ⚠️ Bỏ qua signature verification trong test environment
      const isTestEnvironment = process.env.NODE_ENV !== 'production';
      if (isTestEnvironment) {
        console.log('🧪 Test environment - skipping IPN signature verification');
        return { RspCode: '00', Message: 'Confirm Success (Test Mode)' };
      }

      const sortedParams = this.sortObject(ipnData);
      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
      const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

      const checkSum = secureHash === signed;

      if (checkSum) {
        return { RspCode: '00', Message: 'Confirm Success' };
      } else {
        return { RspCode: '97', Message: 'Invalid Checksum' };
      }
    } catch (error) {
      console.error('Error processing IPN:', error);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  async handleVNPayCallback(callbackData) {
    try {
      const {
        vnp_TxnRef,
        vnp_Amount,
        vnp_ResponseCode,
        vnp_TransactionNo,
        vnp_PayDate,
        orderId,
      } = callbackData;
      let order_id = orderId;
      if (!order_id && vnp_TxnRef) {
        const match = vnp_TxnRef.match(/VNP(\d+)/);
        if (match && match[1]) order_id = match[1];
      }
      
      // Tìm payment record
      const payment = await Payment.findOne({
        order_id: order_id,
        paymentType: "VNPay",
      });
      
      if (!payment)
        return {
          success: false,
          message: "Payment not found",
          orderId: order_id,
        };
        
      if (payment.status === "completed")
        return {
          success: true,
          message: "Payment already processed",
          orderId: order_id,
        };
        
      if (vnp_ResponseCode === "00") {
        await Payment.findByIdAndUpdate(payment._id, {
          status: "completed",
          paymentDate: new Date(),
          responseData: {
            ...payment.responseData,
            vnp_ResponseCode,
            vnp_TransactionNo,
            vnp_PayDate,
            callback: callbackData
          },
        });
        
        // Cập nhật trạng thái đơn hàng
        const order = await Order.findById(order_id);
        if (order) {
          await Order.findByIdAndUpdate(order_id, {
            status: 'processing',
            'payment_info.payment_method': 'vnpay',
            'payment_info.transaction_id': vnp_TxnRef || payment.transactionRef
          });
        }
        
        return {
          success: true,
          message: "Payment processed successfully",
          orderId: order_id,
        };
      } else {
        await Payment.findByIdAndUpdate(payment._id, {
          status: "failed",
          paymentDate: new Date(),
          responseData: {
            ...payment.responseData,
            vnp_ResponseCode,
            vnp_TransactionNo,
            vnp_PayDate,
            callback: callbackData
          },
        });
        
        // Cập nhật trạng thái đơn hàng
        const order = await Order.findById(order_id);
        if (order) {
          await Order.findByIdAndUpdate(order_id, {
            status: 'cancelled',
            'payment_info.payment_method': 'vnpay',
            'payment_info.transaction_id': vnp_TxnRef || payment.transactionRef
          });
        }
        
        return {
          success: false,
          message: "Payment failure processed",
          errorCode: vnp_ResponseCode,
          orderId: order_id,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Error occurred but processed",
        error: error.message,
      };
    }
  }

  sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
  }
}

module.exports = new VNPayService(); 
