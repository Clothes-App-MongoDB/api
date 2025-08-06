const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name: String,
      image: String,
      size: String,
      color: String,
      quantity: Number,
      price: Number,
    }
  ],

  address: {
    full_name: String,
    phone_number: String,
    province: String,
    district: String,
    ward: String,
    street: String
  },

  shipping_fee: { type: Number, required: true },
  payment_method: { type: String, enum: ['cash', 'momo', 'vnpay'], required: true },
  total_amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'],
    default: 'pending'
  }
  ,

  payment_info: {
    transaction_id: String,
    pay_type: String,
    momo_response: Object
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
