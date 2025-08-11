const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const commentController = require('../controllers/comment.controller');

// Lấy danh sách bình luận của 1 sản phẩm
router.get('/product/:productId', commentController.listByProduct);

// Tạo bình luận (yêu cầu đăng nhập)
router.post('/', auth, commentController.create);

// Cập nhật bình luận (chỉ chủ sở hữu)
router.put('/:commentId', auth, commentController.update);

// Xóa bình luận (chỉ chủ sở hữu)
router.delete('/:commentId', auth, commentController.remove);

module.exports = router;


