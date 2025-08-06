const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    status: { type: String, default: "Hiển thị" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", brandSchema);
