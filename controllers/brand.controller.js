const Brand = require("../models/Brand");
const slugify = require("slugify");

exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const slug = slugify(name, { lower: true, locale: "vi" });

    const brand = new Brand({ name, slug });
    await brand.save();
    res.status(201).json(brand);
  } catch (err) {
    res.status(400).json({ message: "Không thể tạo thương hiệu" });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { name, status } = req.body;
    const slug = slugify(name, { lower: true, locale: "vi" });

    const updated = await Brand.findByIdAndUpdate(
      req.params.id,
      { name, slug, status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Không thể cập nhật thương hiệu" });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá thương hiệu" });
  } catch (err) {
    res.status(400).json({ message: "Không thể xoá thương hiệu" });
  }
};
