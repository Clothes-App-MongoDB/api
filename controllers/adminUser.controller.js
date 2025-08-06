// controllers/adminUser.controller.js
const User = require('../models/User');
const mongoose = require('mongoose');

// Lấy danh sách người dùng (phân trang, tìm kiếm, lọc)


exports.getAllUsers = async (req, res) => {
  try {
    const { keyword, status } = req.query;

    const filter = {
      role: 1, // Chỉ lấy user khách hàng
    };

    if (keyword) {
      filter.$or = [
        { full_name: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
        { phone_number: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (status === "0" || status === "1") {
      filter.status = parseInt(status); // phải ép kiểu vì query là string
    }

    const users = await User.find(filter).sort({ created_at: -1 });

    res.json({ users }); // Trả đúng dạng { users: [...] }
  } catch (error) {
    console.error("Lỗi getAllUsers:", error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng' });
  }
};


// Lấy chi tiết một người dùng
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    console.log("Lấy thông tin người dùng ID:", userId);

    // Kiểm tra ID có hợp lệ không
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const user = await User.findById(userId).lean(); // dùng .lean() để tối ưu nếu chỉ đọc

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    if (user.role !== 1) {
      return res.status(403).json({ message: "Không phải tài khoản khách hàng" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};



// Cập nhật trạng thái (khóa/mở) tài khoản
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.json({ message: 'Cập nhật trạng thái thành công', user });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái', error: err.message });
  }
};

// Xóa tài khoản
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.json({ message: 'Xóa người dùng thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa người dùng', error: err.message });
  }
};
// Admin cập nhật thông tin người dùng
exports.adminUpdateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, phone_number, date_of_birth, gender, avatar_url, email, status } = req.body;

    // Kiểm tra trùng số điện thoại
    if (phone_number) {
      const existingPhone = await User.findOne({ phone_number });
      if (existingPhone && existingPhone._id.toString() !== userId) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi người khác.' });
      }
    }

    // Kiểm tra trùng email (nếu cho phép sửa)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail && existingEmail._id.toString() !== userId) {
        return res.status(400).json({ message: 'Email đã được sử dụng bởi người khác.' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        full_name,
        phone_number,
        date_of_birth,
        gender,
        avatar_url,
        email,
        status
      },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    res.json({
      message: 'Cập nhật người dùng thành công',
      user: updated
    });
  } catch (err) {
    console.error('Lỗi khi admin cập nhật người dùng:', err);
    res.status(500).json({ message: 'Không thể cập nhật người dùng' });
  }
};

