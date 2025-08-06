const vnpayService = require('../services/vnpay.service');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const paymentController = {
  /**
   * Tạo URL thanh toán VNPay cho đơn hàng đã có sẵn
   */
  createPayment: async (req, res) => {
    console.log('🔍 DEBUG req.body:', req.body);
    
    try {
      const { order_id, total, user_id, orderInfo, ipAddr } = req.body;
      
      // Lấy IP của client
      const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket?.remoteAddress;
      console.log('🌐 DEBUG clientIp:', clientIp);
      
      const paymentData = {
        order_id,
        total,
        orderInfo: orderInfo || `Thanh toan don hang ${order_id}`,
        user_id,
        ipAddr: ipAddr || clientIp || '',
        bankCode: '',
        orderType: 'billpayment',
        language: 'vn'
      };
      
      console.log('📊 DEBUG paymentData:', paymentData);
      
      const result = await vnpayService.createPaymentUrl(paymentData);
      
      console.log('✅ Payment URL Result:', result);
      
      if (result.success) {
        res.json({
          success: true,
          orderId: result.orderId,
          vnpTxnRef: result.vnpTxnRef,
          paymentUrl: result.paymentUrl
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('❌ Error in createPaymentUrl:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Xử lý return URL từ VNPay (khi user quay về từ trang thanh toán)
   */
  processPaymentReturn: async (req, res) => {
    console.log('🔄 VNPay Return URL called');
    console.log('📋 Query params:', req.query);
    console.log('🌐 Headers:', req.headers);
    
    try {
      const returnData = req.query;
      if (!returnData || !returnData.vnp_ResponseCode) {
        return res.status(400).send(`
          <html>
            <head><title>Kết quả thanh toán</title></head>
            <body>
              <h2>Dữ liệu thanh toán không hợp lệ!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      }
      
      const vnp_TxnRef = returnData.vnp_TxnRef;
      const orderId = returnData.orderId;
      
      console.log('📦 OrderId from URL:', orderId);
      console.log('📦 VNPay params:', returnData);
      
      // Tìm payment record
      const payment = await Payment.findOne({
        order_id: orderId,
        paymentType: 'VNPay'
      });
      
      if (payment) {
        // Cập nhật payment với return data
        await Payment.findByIdAndUpdate(payment._id, {
          responseData: {
            ...payment.responseData,
            return: returnData,
            returnTime: new Date().toISOString()
          }
        });
        
        // Xử lý return data
        returnData.orderId = payment.order_id;
        const handleResult = await vnpayService.handleVNPayCallback(returnData);
        console.log('🔍 Handle result:', handleResult);
        
        if (returnData.vnp_ResponseCode === '00') {
          return res.send(`
            <html>
              <head>
                <title>Thanh toán thành công</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .success { color: #27ae60; }
                  .message { margin: 20px 0; }
                </style>
              </head>
              <body>
                <h2 class="success">✓ Thanh toán thành công!</h2>
                <div class="message">
                  <p>Đơn hàng #${payment.order_id} đã được thanh toán thành công.</p>
                  <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
                </div>
                <script>
                  // Tự động đóng tab sau 3 giây
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </body>
            </html>
          `);
        } else {
          return res.send(`
            <html>
              <head>
                <title>Thanh toán thất bại</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .error { color: #e74c3c; }
                  .message { margin: 20px 0; }
                </style>
              </head>
              <body>
                <h2 class="error">✗ Thanh toán thất bại</h2>
                <div class="message">
                  <p>Đơn hàng #${payment.order_id} thanh toán thất bại.</p>
                  <p>Vui lòng quay lại ứng dụng để thử lại.</p>
                </div>
                <script>
                  // Tự động đóng tab sau 3 giây
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </body>
            </html>
          `);
        }
      } else {
        return res.send(`
          <html>
            <head><title>Không tìm thấy đơn hàng</title></head>
            <body>
              <h2>Không tìm thấy đơn hàng!</h2>
              <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('❌ Error in processPaymentReturn:', error);
      return res.status(500).send(`
        <html>
          <head><title>Lỗi xử lý thanh toán</title></head>
          <body>
            <h2>Có lỗi xảy ra!</h2>
            <p>Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.</p>
          </body>
        </html>
      `);
    }
  },

  verifyPayment: (req, res) => {
    try {
      const vnpParams = req.query;
      if (!vnpParams || Object.keys(vnpParams).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No payment data provided'
        });
      }
      const result = vnpayService.verifyReturnUrl(vnpParams);
      return res.status(200).json({
        ...vnpParams,
        vnp_Amount: parseInt(vnpParams.vnp_Amount) / 100,
        success: result.isValid && result.isSuccessful,
        message: result.isValid 
          ? (result.isSuccessful ? 'Payment success' : 'Payment failed')
          : 'Invalid payment data'
      });
    } catch (error) {
      console.error('[VNPay] verifyPayment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying payment'
      });
    }
  },

  processIpn: (req, res) => {
    try {
      const ipnData = req.query;
      const result = vnpayService.processIpn(ipnData);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[VNPay] processIpn error:', error);
      return res.status(500).json({
        RspCode: '99',
        Message: 'Unknown error'
      });
    }
  },

  handleCallback: async (req, res) => {
    console.log('🔄 VNPay Callback called');
    console.log('📋 Query params:', req.query);
    
    try {
      const callbackData = req.query;
      if (!callbackData || !callbackData.vnp_ResponseCode) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu callback không hợp lệ! Vui lòng quay lại ứng dụng để kiểm tra đơn hàng.'
        });
      }
      
      const vnp_TxnRef = callbackData.vnp_TxnRef;
      
      // Tìm payment record bằng transaction reference
      const payment = await Payment.findOne({
        paymentType: 'VNPay'
      });
      
      let orderId;
      if (payment) {
        orderId = payment.order_id;
        
        // Cập nhật payment với callback data
        await Payment.findByIdAndUpdate(payment._id, {
          responseData: {
            ...payment.responseData,
            callback: callbackData,
            callbackTime: new Date().toISOString()
          }
        });
      
        // Xử lý callback
        callbackData.orderId = orderId;
        const handleResult = await vnpayService.handleVNPayCallback(callbackData);
        
        if (callbackData.vnp_ResponseCode === '00') {
          return res.status(200).json({
            success: true,
            message: 'Thanh toán thành công! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
          });
        } else {
          return res.status(200).json({
            success: false,
            message: 'Thanh toán thất bại hoặc bị hủy! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
          });
        }
      } else {        
        // Thử tìm payment gần nhất nếu không tìm thấy
        const recentPayment = await Payment.findOne({
          paymentType: 'VNPay'
        }).sort({ createdAt: -1 });
        
        if (recentPayment) {
          
          // Cập nhật payment với callback data
          await Payment.findByIdAndUpdate(recentPayment._id, {
            responseData: {
              ...recentPayment.responseData,
              callback: callbackData,
              callbackTime: new Date().toISOString()
            }
          });
          
          orderId = recentPayment.order_id;
          callbackData.orderId = orderId;
          const handleResult = await vnpayService.handleVNPayCallback(callbackData);
          
          if (callbackData.vnp_ResponseCode === '00') {
            return res.status(200).json({
              success: true,
              message: 'Thanh toán thành công! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
            });
          } else {
            return res.status(200).json({
              success: false,
              message: 'Thanh toán thất bại hoặc bị hủy! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
            });
          }
        }
        
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng liên quan callback.'
        });
      }
    } catch (error) {
      console.error('❌ Error in handleCallback:', error);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xử lý thanh toán! Vui lòng kiểm tra đơn hàng trong ứng dụng.'
      });
    }
  },

  checkPaymentStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const payment = await Payment.findOne({
        order_id: orderId,
        paymentType: 'VNPay'
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      return res.status(200).json({
        success: true,
        payment: {
          id: payment._id,
          orderId: payment.order_id,
          amount: payment.amount,
          status: payment.status,
          paymentType: payment.paymentType,
          transactionRef: payment.transactionRef,
          createdAt: payment.createdAt,
          paymentDate: payment.paymentDate
        }
      });
    } catch (error) {
      console.error('[VNPay] checkPaymentStatus error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking payment status'
      });
    }
  }
};

module.exports = paymentController; 