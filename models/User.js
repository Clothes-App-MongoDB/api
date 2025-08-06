const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const Users = new Schema({
  full_name: { type: String, required: true, maxLength: 255 },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Email không hợp lệ']
  },


  password: { type: String, required: true }, // bcrypt hash trước khi lưu

  date_of_birth: { type: Date },

  gender: {
    type: Number,
    default: 0 // 0 = chưa chọn, 1 = nam, 2 = nữ, 3 = khác
  },

  phone_number: {
    type: String,
    // unique: true,
    // sparse: true,
    trim: true,
    default: null
  },


  shipping_phone_number: {
    type: String,
    default: function () {
      return this.phone_number || '';
    }
  },

  is_phone_verified: { type: Boolean, default: false },

  avatar_url: { type: String },


  google_id: {
    type: String,
    sparse: true,
    default: null // thêm để tránh lỗi trùng
  },

  role: {
    type: Number,
    enum: [0, 1], // 0 = admin, 1 = user
    default: 1
  },

  status: {
    type: Number,
    default: 1 // 1 = hoạt động, 0 = bị khóa
  }

}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});
// Tự động hash password trước khi lưu
Users.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Kiểm tra nếu đã hash rồi (đã có dạng bcrypt)
  const isAlreadyHashed = /^\$2[aby]\$.{56}$/.test(this.password);
  if (isAlreadyHashed) return next(); // Bỏ qua nếu đã là bcrypt

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});


module.exports = mongoose.model('User', Users, 'users');
