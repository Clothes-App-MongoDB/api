const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Lấy thông tin người dùng dựa vào token
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      'full_name email phone_number avatar_url date_of_birth gender'
    );

    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

// Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone_number, date_of_birth, gender, avatar_url } = req.body;
    const userId = req.user.userId;

    // Kiểm tra trùng số điện thoại
    if (phone_number) {
      const existing = await User.findOne({ phone_number });
      if (existing && existing._id.toString() !== userId) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi người khác.' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      {
        full_name,
        phone_number,
        date_of_birth,
        gender,
        avatar_url
      },
      { new: true, runValidators: true }
    ).select('full_name phone_number date_of_birth gender avatar_url');

    // 🔑 Tạo lại token mới
    const token = jwt.sign(
      { userId: updated._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Cập nhật thông tin thành công',
      user: updated,
      token // ✅ Trả token mới về
    });
  } catch (err) {
    console.error('Lỗi khi cập nhật thông tin:', err);
    res.status(500).json({ message: 'Không thể cập nhật thông tin' });
  }
};
// Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    user.password = hashed;
    await user.save();

    // 🔐 Tạo lại JWT token mới
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Đổi mật khẩu thành công',
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

