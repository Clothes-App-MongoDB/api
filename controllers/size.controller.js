const Size = require("../models/Size");

// GET all sizes danh 
exports.getAllSizes = async (req, res) => {
  try {
    const sizes = await Size.find().sort({ createdAt: -1 });
    res.json(sizes);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// POST create size Thêm
exports.createSize = async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    if (!name) return res.status(400).json({ message: "Tên size không hợp lệ" });

    // Kiểm tra trùng
    const exists = await Size.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (exists)
      return res.status(409).json({ message: "Size đã tồn tại" });

    const size = await Size.create({ name });     // gọn hơn new+save
    res.status(201).json(size);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Không thể tạo size" });
  }
};


// PUT update size Cập nhật
exports.updateSize = async (req, res) => {
  try {
    const { name, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (status !== undefined) update.status = status;

    const updated = await Size.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }   // runValidators để giữ validations của schema
    );
    if (!updated) return res.status(404).json({ message: "Size không tồn tại" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Không thể cập nhật size" });
  }
};


// DELETE size Xóa
exports.deleteSize = async (req, res) => {
  try {
    const deleted = await Size.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Size không tồn tại" });
    res.json({ message: "Đã xoá size" });
  } catch (err) {
    res.status(400).json({ message: "Không thể xoá size" });
  }
};

