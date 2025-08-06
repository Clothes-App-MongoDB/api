const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // VD: S, M, L
    status: { type: String, default: "Hiển thị" }, // hoặc "Ẩn"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Size", sizeSchema);
