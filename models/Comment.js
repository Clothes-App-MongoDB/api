const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

// Mỗi user chỉ được bình luận 1 lần trên mỗi sản phẩm
commentSchema.index({ product_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('Comment', commentSchema);


