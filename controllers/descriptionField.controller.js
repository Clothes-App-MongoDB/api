// controllers/descriptionField.controller.js
const DescriptionField = require("../models/DescriptionField");
const slugify = require("slugify");

// Lấy danh sách các mục mô tả
exports.getAll = async (req, res) => {
  try {
    const fields = await DescriptionField.find().sort({ createdAt: -1 });
    res.json(fields);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách mục mô tả" });
  }
};

// Tạo mới mục mô tả
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Tên mục mô tả không được để trống" });

    const slug = slugify(name, { lower: true, locale: "vi" });
    const field = new DescriptionField({ name, slug });
    await field.save();

    res.status(201).json(field);
  } catch (err) {
    res.status(400).json({ message: "Không thể tạo mục mô tả" });
  }
};

// Cập nhật mục mô tả
exports.update = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = slugify(name, { lower: true, locale: "vi" });

    const updated = await DescriptionField.findByIdAndUpdate(
      req.params.id,
      { name, slug },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy mục mô tả" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Không thể cập nhật mục mô tả" });
  }
};

// Xóa mục mô tả
exports.delete = async (req, res) => {
  try {
    const deleted = await DescriptionField.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy mục mô tả để xoá" });
    res.json({ message: "Đã xoá mục mô tả" });
  } catch (err) {
    res.status(400).json({ message: "Không thể xoá mục mô tả" });
  }
};
