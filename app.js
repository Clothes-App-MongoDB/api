require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const connectDB = require("./config/db");
const addressRoutes = require('./routes/address.route');
const orderRoutes = require("./routes/order.routes");
// Kết nối MongoDB
connectDB();

const app = express();

// Biến môi trường
const isProduction = process.env.NODE_ENV === "production";


// Log origin để kiểm tra request từ đâu
app.use((req, res, next) => {
  console.log("=> Origin:", req.headers.origin);
  next();
});

// CORS cấu hình chuẩn cho cả localhost và vercel
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://mazonepoly-admin.vercel.app",
  ],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Các middleware cần thiết
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static folder cho ảnh upload (chỉ dùng ở local)
if (!isProduction) {
  const uploadsPath = path.join(__dirname, "tmp", "uploads"); //dùng __dirname
  app.use("/uploads", express.static(uploadsPath));
  console.log("=> Đang dùng ảnh local từ", uploadsPath);
}else {
  console.log("=> Đang dùng Cloudinary - không cần /uploads");
}

// Các routes
app.use("/", require("./routes/index"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/products", require("./routes/product.routes"));
app.use("/api/categories", require("./routes/category.routes"));
app.use("/api/brands", require("./routes/brand.routes"));
app.use("/api/sizes", require("./routes/size.routes"));
app.use("/api/description-fields", require("./routes/descriptionField.routes"));
app.use("/api/upload", require("./routes/upload.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
// Nhóm route quản lý user bởi admin
app.use("/api/admin", require("./routes/adminUser.routes"));
app.use('/api/addresses', addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", require("./routes/payment.routes"));

module.exports = app;
