const wishlistService = require('../services/wishlist.service');

exports.getMyWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wishlist = await wishlistService.getWishlist(userId);
    res.status(200).json(wishlist);
  } catch (error) {
    console.error('Lỗi lấy danh sách yêu thích:', error);
    res.status(error.status || 500).json({ message: error.message || 'Không thể lấy danh sách yêu thích' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'Thiếu productId' });

    const wishlist = await wishlistService.addProduct(userId, productId);
    res.status(200).json({ message: 'Đã thêm vào yêu thích', wishlist });
  } catch (error) {
    console.error('Lỗi thêm vào yêu thích:', error);
    res.status(error.status || 500).json({ message: error.message || 'Không thể thêm vào yêu thích' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    if (!productId) return res.status(400).json({ message: 'Thiếu productId' });

    const wishlist = await wishlistService.removeProduct(userId, productId);
    res.status(200).json({ message: 'Đã xoá khỏi yêu thích', wishlist });
  } catch (error) {
    console.error('Lỗi xoá khỏi yêu thích:', error);
    res.status(error.status || 500).json({ message: error.message || 'Không thể xoá khỏi yêu thích' });
  }
};

exports.check = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.productId || req.query.productId;
    if (!productId) return res.status(400).json({ message: 'Thiếu productId' });

    const inWishlist = await wishlistService.isInWishlist(userId, productId);
    return res.status(200).json({ inWishlist });
  } catch (error) {
    console.error('Lỗi kiểm tra wishlist:', error);
    res.status(error.status || 500).json({ message: error.message || 'Không thể kiểm tra wishlist' });
  }
};


