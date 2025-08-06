const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const isProduction = process.env.NODE_ENV === "production";

let storage;

if (isProduction) {
  // Cloudinary config (Render/Vercel)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "mazone",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [{ width: 800, height: 800, crop: "limit" }],
    },
  });
} else {
  // Local upload (to /tmp/uploads)
  // Sửa lại cho trùng với path static bạn dùng ở app.js
  const uploadDir = path.join(__dirname, "..", "tmp", "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
      cb(null, uniqueName);
    },
  });
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(ext);
  if (mimeType && extname) return cb(null, true);
  cb(new Error(" Chỉ chấp nhận ảnh jpeg, jpg, png, gif, webp"));
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
