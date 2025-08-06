const express = require("express");
const router = express.Router();
const controller = require("../controllers/descriptionField.controller");

// Lấy tất cả các mục mô tả
router.get("/", controller.getAll);

// Tạo mới mục mô tả
router.post("/", controller.create);

// Cập nhật mục mô tả
router.put("/:id", controller.update);

// Xoá mục mô tả
router.delete("/:id", controller.delete);

module.exports = router;
