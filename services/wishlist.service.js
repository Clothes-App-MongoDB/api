const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

class WishlistService {
  async getOrCreateWishlist(userId) {
    let wishlist = await Wishlist.findOne({ user_id: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user_id: userId, products: [] });
    }
    return wishlist;
  }

  async getWishlist(userId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const populated = await Wishlist.findById(wishlist._id)
      .populate('products', 'name image price brand status createdAt');
    return populated;
  }

  async addProduct(userId, productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('ID sản phẩm không hợp lệ');
      err.status = 400;
      throw err;
    }

    const product = await Product.findById(productId);
    if (!product) {
      const err = new Error('Không tìm thấy sản phẩm');
      err.status = 404;
      throw err;
    }

    // Dùng $addToSet để tránh trùng lặp
    const wishlist = await Wishlist.findOneAndUpdate(
      { user_id: userId },
      { $addToSet: { products: product._id } },
      { new: true, upsert: true }
    ).populate('products', 'name image price brand status createdAt');

    return wishlist;
  }

  async removeProduct(userId, productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      const err = new Error('ID sản phẩm không hợp lệ');
      err.status = 400;
      throw err;
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user_id: userId },
      { $pull: { products: productId } },
      { new: true }
    ).populate('products', 'name image price brand status createdAt');

    return wishlist;
  }

  async isInWishlist(userId, productId) {
    const wishlist = await Wishlist.findOne({ user_id: userId, products: productId });
    return !!wishlist;
  }
}

module.exports = new WishlistService();


