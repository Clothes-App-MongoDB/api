const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // dùng TLS
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // là APP PASSWORD, không phải mật khẩu Gmail thường
  },
});

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"MazonePoly 👕" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email đã gửi đến ${to}`);
  } catch (err) {
    console.error(`❌ Gửi email thất bại đến ${to}:`, err);
    throw new Error("Không thể gửi email"); // để controller bắt được
  }
};


module.exports = sendMail;
