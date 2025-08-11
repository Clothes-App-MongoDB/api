const commentService = require('../services/comment.service');

exports.listByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page, limit } = req.query;
    const result = await commentService.listByProduct(productId, { page, limit });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi lấy bình luận:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Không thể lấy bình luận' });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, content, rating } = req.body;
    console.log("userId", userId);
    console.log("productId", productId);
    console.log("content", content);
    console.log("rating", rating);
    const comment = await commentService.create(userId, { productId, content, rating });
    return res.status(201).json({ message: 'Đã thêm bình luận', comment });
  } catch (error) {
    console.error('Lỗi tạo bình luận:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Không thể tạo bình luận' });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;
    const { content, rating } = req.body;
    const comment = await commentService.update(userId, commentId, { content, rating });
    return res.status(200).json({ message: 'Đã cập nhật bình luận', comment });
  } catch (error) {
    console.error('Lỗi cập nhật bình luận:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Không thể cập nhật bình luận' });
  }
};

exports.remove = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { commentId } = req.params;
    await commentService.remove(userId, commentId);
    return res.status(200).json({ message: 'Đã xóa bình luận' });
  } catch (error) {
    console.error('Lỗi xóa bình luận:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Không thể xóa bình luận' });
  }
};


