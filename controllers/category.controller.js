const Category = require("../models/Category");
const slugify = require("slugify");

// Lấy danh sách danh mục
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Tạo danh mục mới
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = slugify(name, { lower: true, locale: "vi" });

    const category = new Category({ name, slug });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: "Không thể tạo danh mục" });
  }
};

// Cập nhật danh mục
exports.updateCategory = async (req, res) => {
  try {
    const { name, status } = req.body;
    const slug = slugify(name, { lower: true, locale: "vi" });

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name, slug, status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Không thể cập nhật danh mục" });
  }
};

// Xoá danh mục
exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá danh mục" });
  } catch (err) {
    res.status(400).json({ message: "Không thể xoá danh mục" });
  }
};
