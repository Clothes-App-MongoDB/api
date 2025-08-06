const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sendMail = require("../utils/sendMail");
const OtpCode = require("../models/otp.model");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 1. Đăng ký & gửi OTP
exports.register = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được đăng ký" });
    }

    // Tạo mã OTP ngẫu nhiên
    const otp = crypto.randomInt(100000, 999999).toString();

    // Lưu mã OTP vào DB (ghi đè nếu đã tồn tại)
    await OtpCode.findOneAndUpdate(
      { email },
      {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Hết hạn sau 10 phút
      },
      { upsert: true, new: true }
    );

    // Gửi email xác minh
    const html = `<p>Xin chào ${full_name || "bạn"},</p>
    <p>Mã xác minh (OTP) của bạn là: <b>${otp}</b></p>
    <p>Mã này sẽ hết hạn sau 10 phút.</p>`;

    await sendMail(email, "Xác minh tài khoản - MazonePoly", html);

    res.json({ message: "Đã gửi mã OTP xác minh tới email", email });
  } catch (error) {
    console.error("Lỗi gửi OTP:", error);
    res.status(500).json({ message: "Không thể gửi mã OTP" });
  }
};

// 2. Xác minh OTP & tạo tài khoản
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, full_name, password } = req.body;

    // 1. Tìm mã OTP hợp lệ
    const otpDoc = await OtpCode.findOne({ email, code: otp });

    if (!otpDoc || otpDoc.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });
    }

    // 2. Kiểm tra xem tài khoản đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Tài khoản đã tồn tại, vui lòng đăng nhập" });
    }

    // 3. Tạo tài khoản (password sẽ được hash nhờ pre('save'))
    const newUser = new User({
      email,
      full_name,
      password,
      is_phone_verified: false,
    });
    await newUser.save();

    // 4. Xoá OTP sau khi xác minh
    await OtpCode.deleteMany({ email });

    // 5. Tạo JWT token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6. Trả về kết quả
    res.json({
      message: "Đăng ký và xác minh thành công",
      token,
      user: {
        id: newUser._id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Lỗi xác minh OTP:", err);
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// 3. Đăng nhập
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Kiểm tra email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // Kiểm tra trạng thái
    if (user.status === 0) {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa" });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Trả về kết quả
    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Lỗi khi đăng nhập:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
