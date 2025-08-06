const Product = require("../models/Product");
const cloudinary = require("../utils/cloudinary");
const path = require("path");
const mongoose = require("mongoose");


// Kiểm tra có dùng Cloudinary không
const useCloudinary = process.env.USE_CLOUDINARY === "true";

// Lấy đường dẫn URL đúng cho ảnh (local hoặc cloud)
function getImageUrl(file) {
  if (useCloudinary) return file.path; // Cloudinary trả link
  return `/uploads/${file.filename}`;   // Local
}

// Lấy public_id từ link Cloudinary để xoá
function extractPublicId(url) {
  const parts = url.split("/");
  const filename = parts.pop().split(".")[0];
  const folder = "mazone";
  return `${folder}/${filename}`;
}

// Lấy tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const filter = {};

    // Lọc theo featured
    if (req.query.featured === 'true') {
      filter.is_featured = true;
    }

    // Lọc theo tên danh mục (category)
    if (req.query.category) {
      filter.category = {
        $regex: `^${req.query.category}$`,
        $options: 'i' // Không phân biệt hoa thường
      };
    }

    const products = await Product.find(filter)
      .collation({ locale: 'vi', strength: 1 }) // Hỗ trợ tiếng Việt
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", err);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm" });
  }
};



// Lấy sản phẩm theo ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json(product);
  } catch (err) {
    console.error("Lỗi khi lấy sản phẩm:", err);
    res.status(500).json({ message: "Lỗi server khi lấy sản phẩm" });
  }
};

// Thêm sản phẩm mới
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      brand,
      status = "Đang bán",
      description,
      variations: variationsRaw,
    } = req.body;

    if (!name || !category || !brand)
      return res.status(400).json({ message: "Tên, danh mục và thương hiệu là bắt buộc." });

    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum <= 0)
      return res.status(400).json({ message: "Giá phải là số dương." });

    let parsedDescription = [];
    if (description) {
      try {
        parsedDescription = JSON.parse(description);
        const ok = Array.isArray(parsedDescription) && parsedDescription.every(d => d.field && d.value);
        if (!ok) throw new Error();
      } catch {
        return res.status(400).json({ message: "Trường description không hợp lệ." });
      }
    }

    let variations = [];
    if (variationsRaw) {
      try {
        variations = JSON.parse(variationsRaw);
        const ok = Array.isArray(variations) && variations.every(v => v.color && v.size && !isNaN(v.quantity));
        if (!ok) throw new Error();
      } catch {
        return res.status(400).json({ message: "Trường variations không hợp lệ." });
      }
    }

    const totalQuantity = variations.reduce((sum, v) => sum + Number(v.quantity), 0);

    if (!req.files?.image?.[0])
      return res.status(400).json({ message: "Phải có ảnh đại diện (image)." });

    const imageURL = getImageUrl(req.files.image[0]);

    const extraImgs = req.files?.images || [];
    if (extraImgs.length > 6)
      return res.status(400).json({ message: "Tối đa 6 ảnh bổ sung." });

    const images = extraImgs.map(file => getImageUrl(file));

    const product = await Product.create({
      name: name.trim(),
      image: imageURL,
      images,
      description: parsedDescription,
      price: priceNum,
      quantity: totalQuantity,
      category: category.trim(),
      brand: brand.trim(),
      variations,
      status: status.trim(),
      is_featured: req.body.is_featured === 'true' || req.body.is_featured === true,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("Lỗi khi tạo sản phẩm:", err);
    res.status(500).json({ message: "Không thể tạo sản phẩm." });
  }
};

// Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (typeof req.body.is_featured !== 'undefined') {
      updateData.is_featured = req.body.is_featured === 'true' || req.body.is_featured === true;
    }


    // Parse description
    if (typeof updateData.description === "string") {
      try {
        updateData.description = JSON.parse(updateData.description);
      } catch {
        return res.status(400).json({ message: "Mô tả không hợp lệ." });
      }
    }

    // Parse variations
    if (req.body.variations) {
      try {
        const parsedVariations = JSON.parse(req.body.variations);
        if (!Array.isArray(parsedVariations)) {
          return res.status(400).json({ message: "Variations phải là mảng." });
        }
        for (const v of parsedVariations) {
          if (!v.color || !v.size || isNaN(v.quantity)) {
            return res.status(400).json({ message: "Variation thiếu thông tin." });
          }
        }
        updateData.variations = parsedVariations;
        updateData.quantity = parsedVariations.reduce((sum, v) => sum + Number(v.quantity || 0), 0);
      } catch {
        return res.status(400).json({ message: "Variations không hợp lệ." });
      }
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại." });

    // Xử lý ảnh đại diện
    if (req.files?.image?.[0]) {
      const newImage = getImageUrl(req.files.image[0]);
      updateData.image = newImage;

      if (useCloudinary && product.image?.includes("res.cloudinary.com")) {
        try {
          const publicId = extractPublicId(product.image);
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Không thể xoá ảnh đại diện cũ:", err.message);
        }
      }
    } else if (req.body.imageMode === "keep") {
      updateData.image = product.image;
    } else {
      updateData.image = "";
    }

    // Xử lý ảnh bổ sung
    let updatedImages = product.images || [];

    // Xoá ảnh cũ
    if (req.body.imagesToRemove) {
      let imagesToRemove = [];
      try {
        imagesToRemove = JSON.parse(req.body.imagesToRemove);
      } catch {
        return res.status(400).json({ message: "imagesToRemove không hợp lệ." });
      }

      updatedImages = updatedImages.filter((img) => !imagesToRemove.includes(img));

      if (useCloudinary) {
        for (const imgUrl of imagesToRemove) {
          try {
            const publicId = extractPublicId(imgUrl);
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.error("Không thể xoá ảnh:", err.message);
          }
        }
      }
    }

    // Thêm ảnh mới nếu có
    if (req.files?.images?.length > 0) {
      const newImages = req.files.images.map((file) => getImageUrl(file));
      if (req.body.imagesMode === "append") {
        updatedImages = [...updatedImages, ...newImages];
      } else {
        updatedImages = newImages;
      }
    }

    updateData.images = updatedImages;

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("Lỗi cập nhật sản phẩm:", err);
    res.status(500).json({ message: "Không thể cập nhật sản phẩm." });
  }
};

// Xoá sản phẩm
exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xoá sản phẩm" });
  } catch (err) {
    console.error("Lỗi khi xoá sản phẩm:", err);
    res.status(400).json({ message: "Không thể xoá sản phẩm" });
  }
};

exports.toggleFeatured = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID sản phẩm không hợp lệ." });
  }

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });

    product.is_featured = !product.is_featured;
    await product.save();

    res.json({ message: "Cập nhật trạng thái nổi bật thành công.", is_featured: product.is_featured });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server." });
  }
};
// Lấy sản phẩm liên quan theo category (loại trừ sản phẩm hiện tại)
exports.getRelatedProductsByCategory = async (req, res) => {
  const { category, exclude } = req.query;

  try {
    const products = await Product.find({
      category,
      _id: { $ne: exclude },
    }).limit(8);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy sản phẩm liên quan" });
  }
};

