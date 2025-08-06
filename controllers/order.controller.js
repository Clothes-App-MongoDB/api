const Order = require('../models/Order');
const User = require('../models/User');

exports.createCashOrder = async (req, res) => {
  try {
    const {
      items,
      address,
      shipping_fee,
      payment_method = 'cash',
      total_amount
    } = req.body;

    const user_id = req.user?.userId;
    if (!user_id) {
      return res.status(401).json({ message: 'Người dùng chưa được xác thực.' });
    }

    // Kiểm tra thông tin đầu vào
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Danh sách sản phẩm không hợp lệ.' });
    }

    for (const item of items) {
      const { product_id, color, size, quantity, price } = item;
      if (!product_id || !color || !size || !quantity || !price) {
        return res.status(400).json({
          message: 'Mỗi sản phẩm phải có đủ: product_id, color, size, quantity, price.'
        });
      }
    }

    if (
      !address ||
      !address.full_name ||
      !address.phone_number ||
      !address.province ||
      !address.district ||
      !address.ward ||
      !address.street
    ) {
      return res.status(400).json({ message: 'Địa chỉ giao hàng không đầy đủ.' });
    }

    if (typeof shipping_fee !== 'number' || typeof total_amount !== 'number') {
      return res.status(400).json({ message: 'shipping_fee và total_amount phải là số.' });
    }

    // Tạo đơn hàng
    const order = new Order({
      user_id,
      items,
      address,
      shipping_fee,
      payment_method,
      total_amount,
      status: 'pending',
      payment_info: {}
    });

    const savedOrder = await order.save();

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng thanh toán tiền mặt:', error);
    res.status(500).json({ message: 'Tạo đơn hàng thất bại.' });
  }
};
// Lấy danh sách đơn hàng của chính người dùng
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = await Order.find({ user_id: userId }).sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error);
    res.status(500).json({ message: "Không thể lấy danh sách đơn hàng." });
  }
};
// Cập nhật trạng thái
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    const currentStatus = order.status;

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipping', 'cancelled'],
      shipping: ['delivered'],
    };

    if (['delivered', 'cancelled'].includes(currentStatus)) {
      return res.status(400).json({ message: "Đơn hàng đã hoàn tất hoặc đã bị hủy, không thể cập nhật." });
    }

    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(newStatus)) {
      return res.status(400).json({
        message: `Không thể chuyển trạng thái từ "${currentStatus}" sang "${newStatus}". Trạng thái hợp lệ tiếp theo: ${allowedNextStatuses.join(', ')}.`
      });
    }

    order.status = newStatus;
    await order.save();

    // ✅ An toàn khi gửi WebSocket
    const connectedUsers = req.app.get("connectedUsers");
    const io = req.app.get("io");

    if (connectedUsers && connectedUsers instanceof Map && io) {
      const socketId = connectedUsers.get(order.user_id.toString());
      if (socketId) {
        io.to(socketId).emit("orderStatusUpdated", {
          orderId: order._id,
          newStatus: order.status,
          updatedAt: order.updatedAt,
        });
      }
    }

    res.status(200).json({
      message: "Cập nhật trạng thái đơn hàng thành công.",
      order
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đơn hàng:", error);
    res.status(500).json({ message: "Cập nhật thất bại." });
  }
};



// Lấy danh sách tất cả đơn hàng (dành cho admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, sort } = req.query;

    const filter = {};

    // Lọc theo status nếu có
    if (status && ['pending', 'processing', 'shipping', 'delivered', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    // Xác định hướng sắp xếp
    const sortOption = sort === 'asc' ? 1 : -1;

    console.log(' Đang lấy danh sách đơn hàng với filter:', filter);

    const orders = await Order.find(filter)
      .populate('user_id', 'full_name email') // Lấy tên/email khách hàng
      .populate('items.product_id', 'name')   // lấy tên sản phẩm
      .sort({ createdAt: sortOption })
      .lean();

    console.log(` Đã tìm được ${orders.length} đơn hàng.`);
    res.status(200).json(orders);
  } catch (error) {
    console.error(' Lỗi khi lấy danh sách đơn hàng admin:', error);
    res.status(500).json({ message: 'Không thể tải danh sách đơn hàng.' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: "Đơn hàng không thể hủy." });
    }

    const userId = req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && order.user_id.toString() !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này." });
    }

    if (!isAdmin && order.status !== 'pending') {
      return res.status(403).json({ message: "Bạn chỉ có thể hủy đơn hàng khi đang chờ xác nhận." });
    }

    order.status = 'cancelled';
    await order.save();

    //  Gửi event realtime
    const connectedUsers = req.app.get("connectedUsers"); // Map userId => socketId
    const socketId = connectedUsers.get(order.user_id.toString());
    if (socketId) {
      io.to(socketId).emit("orderStatusUpdated", {
        orderId: order._id,
        newStatus: order.status,
        updatedAt: order.updatedAt,
      });
    }


    res.status(200).json({ message: 'Đơn hàng đã được hủy.', order });
  } catch (error) {
    console.error('Lỗi khi huỷ đơn hàng:', error);
    res.status(500).json({ message: 'Không thể hủy đơn hàng.' });
  }
};

// Thêm function tạo đơn hàng VNPay
exports.createVNPayOrder = async (req, res) => {
  try {
    const {
      items,
      address,
      shipping_fee,
      total_amount
    } = req.body;

    const user_id = req.user?.userId;
    if (!user_id) {
      return res.status(401).json({ message: 'Người dùng chưa được xác thực.' });
    }

    // Kiểm tra thông tin đầu vào
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Danh sách sản phẩm không hợp lệ.' });
    }

    for (const item of items) {
      const { product_id, color, size, quantity, price } = item;
      if (!product_id || !color || !size || !quantity || !price) {
        return res.status(400).json({
          message: 'Mỗi sản phẩm phải có đủ: product_id, color, size, quantity, price.'
        });
      }
    }

    if (
      !address ||
      !address.full_name ||
      !address.phone_number ||
      !address.province ||
      !address.district ||
      !address.ward ||
      !address.street
    ) {
      return res.status(400).json({ message: 'Địa chỉ giao hàng không đầy đủ.' });
    }

    if (typeof shipping_fee !== 'number' || typeof total_amount !== 'number') {
      return res.status(400).json({ message: 'shipping_fee và total_amount phải là số.' });
    }

    // Tạo đơn hàng với payment_method = 'vnpay'
    const order = new Order({
      user_id,
      items,
      address,
      shipping_fee,
      payment_method: 'vnpay',
      total_amount,
      status: 'pending',
      payment_info: {}
    });

    const savedOrder = await order.save();

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng VNPay:', error);
    res.status(500).json({ message: 'Tạo đơn hàng thất bại.' });
  }
};