const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/authMiddleware'); 
const Address = require('../models/Address');

// Áp dụng middleware xác thực cho tất cả route bên dưới
router.use(authMiddleware);

// Thêm địa chỉ mới (gắn tự động userId từ token)
router.post('/', addressController.addAddress);

// Lấy tất cả địa chỉ của user (dựa vào token)
router.get('/', addressController.getAddressesByUser);

// Cập nhật địa chỉ
router.put('/:id', addressController.updateAddress);



// Xóa địa chỉ
router.delete('/:id', addressController.deleteAddress);

// Lấy địa chỉ mặc định
router.get('/default', async (req, res) => {
  try {
    const defaultAddress = await Address.findOne({
      user_id: req.user.userId,
      is_default: true,
    });

    // Nếu không có địa chỉ mặc định, trả về null
    if (!defaultAddress) {
      return res.status(200).json(null);
    }

    // Nếu có thì trả về như bình thường
    res.json(defaultAddress);
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});


// Cập nhật địa chỉ mặc định
router.put('/:id/set-default', async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.params.id;

    // Bỏ cờ mặc định ở tất cả địa chỉ của user
    await Address.updateMany({ user_id: userId }, { is_default: false });

    // Gán địa chỉ mới là mặc định
    const updated = await Address.findByIdAndUpdate(addressId, { is_default: true }, { new: true });

    res.json(updated);
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).json({ message: 'Lỗi cập nhật địa chỉ mặc định' });
  }
});
// Lấy đại chỉ theo id 
router.get('/:id', addressController.getAddressById);

module.exports = router;
