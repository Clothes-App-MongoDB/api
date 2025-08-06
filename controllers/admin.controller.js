const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const OtpCode = require("../models/otp.model");
const sendMail = require("../utils/sendMail");

// ĐĂNG KÝ
exports.register = async (req, res) => {
  const { username, password, name, email, phone } = req.body;

  try {
    const existingAdmin = await Admin.findOne({ phone });
    if (existingAdmin) {
      return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
    }
    const existingEmail = await Admin.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }
    const existingUsername = await Admin.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username đã tồn tại" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      username,
      password: hashedPassword,
      name,
      email,
      phone,
    });

    await newAdmin.save();
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// // ĐĂNG NHẬP
exports.login = async (req, res) => {
  const { phone, password } = req.body;

  try {
    const admin = await Admin.findOne({ phone });
    if (!admin) return res.status(400).json({ message: "Tài khoản không tồn tại" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu" });

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );


    res.json({
      token,
      admin: {
        username: admin.username,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
// ĐỔI MẬT KHẨU
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const adminId = req.user.userId; // Lấy từ middleware xác thực

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Không tìm thấy admin" });

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.sendAdminOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email là bắt buộc" });

  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP hết hạn sau 5 phút

  try {
    await OtpCode.findOneAndUpdate(
      { email },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    const html = `
      <h2>Mã xác thực đặt lại mật khẩu:</h2>
      <h3>${code}</h3>
      <p>Mã có hiệu lực trong 5 phút. Không chia sẻ với bất kỳ ai.</p>
    `;

    await sendMail(email, "Mã OTP xác minh quản trị viên Mazone", html);

    res.json({ message: "✅ Mã OTP đã được gửi qua email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi gửi OTP" });
  }
};
exports.resetAdminPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết" });
  }

  try {
    const otpRecord = await OtpCode.findOne({ email });
    if (!otpRecord || otpRecord.code !== code) {
      return res.status(400).json({ message: "OTP không hợp lệ" });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP đã hết hạn" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Không tìm thấy admin" });

    const hashed = await bcrypt.hash(newPassword, 10);
    admin.password = hashed;
    await admin.save();
    await OtpCode.deleteOne({ email });

    res.json({ message: "✅ Đặt lại mật khẩu thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
