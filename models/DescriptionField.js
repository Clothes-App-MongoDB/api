const mongoose = require("mongoose");

const descriptionFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    status: { type: String, default: "Hiển thị" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DescriptionField", descriptionFieldSchema);
