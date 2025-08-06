const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: { type: String, default: "Hiển thị" }, // hoặc "Ẩn"
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Category", categorySchema);
