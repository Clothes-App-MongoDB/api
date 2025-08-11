const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Product = require('../models/Product');

class CommentService {
  async listByProduct(productId, { page = 1, limit = 10 } = {}) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('ID sản phẩm không hợp lệ');
      err.status = 400;
      throw err;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Comment.find({ product_id: productId })
        .populate('user_id', 'full_name avatar_url')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Comment.countDocuments({ product_id: productId }),
    ]);

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  async create(userId, { productId, content, rating }) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('ID sản phẩm không hợp lệ');
      err.status = 400;
      throw err;
    }
    if (!content || !content.trim()) {
      const err = new Error('Nội dung bình luận không được để trống');
      err.status = 400;
      throw err;
    }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      const err = new Error('Số sao (rating) phải từ 1 đến 5');
      err.status = 400;
      throw err;
    }

    const product = await Product.findById(productId);
    if (!product) {
      const err = new Error('Không tìm thấy sản phẩm');
      err.status = 404;
      throw err;
    }

    // Tạo hoặc báo lỗi nếu đã tồn tại
    const existing = await Comment.findOne({ product_id: productId, user_id: userId });
    if (existing) {
      const err = new Error('Bạn đã đánh giá sản phẩm này. Vui lòng chỉnh sửa đánh giá hiện có.');
      err.status = 409;
      throw err;
    }

    const comment = await Comment.create({
      product_id: productId,
      user_id: userId,
      content: content.trim(),
      rating: ratingNum,
    });

    return comment.populate('user_id', 'full_name avatar_url');
  }

  async update(userId, commentId, { content, rating }) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      const err = new Error('ID bình luận không hợp lệ');
      err.status = 400;
      throw err;
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      const err = new Error('Không tìm thấy bình luận');
      err.status = 404;
      throw err;
    }
    if (comment.user_id.toString() !== userId) {
      const err = new Error('Bạn không có quyền sửa bình luận này');
      err.status = 403;
      throw err;
    }

    if (typeof content === 'string') {
      comment.content = content.trim();
    }
    if (typeof rating !== 'undefined') {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        const err = new Error('Số sao (rating) phải từ 1 đến 5');
        err.status = 400;
        throw err;
      }
      comment.rating = ratingNum;
    }
    await comment.save();
    return comment.populate('user_id', 'full_name avatar_url');
  }

  async remove(userId, commentId) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      const err = new Error('ID bình luận không hợp lệ');
      err.status = 400;
      throw err;
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
      const err = new Error('Không tìm thấy bình luận');
      err.status = 404;
      throw err;
    }
    if (comment.user_id.toString() !== userId) {
      const err = new Error('Bạn không có quyền xóa bình luận này');
      err.status = 403;
      throw err;
    }
    await Comment.findByIdAndDelete(commentId);
    return { success: true };
  }
}

module.exports = new CommentService();


