const Address = require('../models/Address');
const mongoose = require('mongoose');

// Thêm địa chỉ mới
exports.addAddress = async (req, res) => {
    console.log("Add Address - req.body:", req.body);
    try {
        const {
            full_name,
            phone_number,
            province,
            district,
            ward,
            street,
            is_default
        } = req.body;

        const user_id = req.user?.userId;
        if (!user_id) {
            return res.status(401).json({ message: 'Không xác định được người dùng' });
        }

        if (is_default) {
            await Address.updateMany(
                { user_id },
                { $set: { is_default: false } }
            );
        }

        const newAddress = new Address({
            user_id,
            full_name,
            phone_number,
            province,
            district,
            ward,
            street,
            is_default: !!is_default,
        });

        const savedAddress = await newAddress.save();
        res.status(201).json(savedAddress);

    } catch (err) {
        console.error("Lỗi khi thêm địa chỉ:", err);
        res.status(500).json({ message: 'Thêm địa chỉ thất bại', error: err.message });
    }
};

// Lấy địa chỉ theo ID
exports.getAddressById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Tìm địa chỉ theo id và user_id
        const address = await Address.findOne({ _id: id, user_id: userId });
        if (!address) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        res.json(address);
    } catch (err) {
        console.error("Lỗi khi lấy địa chỉ theo ID:", err);
        res.status(500).json({ message: 'Lỗi khi lấy địa chỉ', error: err.message });
    }
};

// Lấy danh sách địa chỉ của user
exports.getAddressesByUser = async (req, res) => {
    try {
        const rawUserId = req.user.userId;

        // Kiểm tra ObjectId hợp lệ trước khi sử dụng
        if (!mongoose.Types.ObjectId.isValid(rawUserId)) {
            return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
        }

        const userId = new mongoose.Types.ObjectId(rawUserId);

        const addresses = await Address.find({ user_id: userId }).sort({ is_default: -1 });
        res.json(addresses);
    } catch (err) {
        console.error("Lỗi lấy địa chỉ:", err);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách địa chỉ', error: err.message });
    }
};


// Cập nhật địa chỉ
exports.updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name,
            phone_number,
            province,
            district,
            ward,
            street,
            is_default
        } = req.body;

        const userId = req.user.userId;

        // Tìm địa chỉ theo ID và user_id
        const address = await Address.findOne({ _id: id, user_id: userId });
        if (!address) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        // Nếu set là mặc định, bỏ mặc định các địa chỉ khác
        if (is_default) {
            await Address.updateMany(
                { user_id: userId },
                { $set: { is_default: false } }
            );
        }

        // Cập nhật các trường
        address.full_name = full_name;
        address.phone_number = phone_number;
        address.province = province;
        address.district = district;
        address.ward = ward;
        address.street = street;
        address.is_default = !!is_default;

        await address.save();
        res.json(address);
    } catch (err) {
        console.error("Lỗi khi cập nhật địa chỉ:", err);
        res.status(500).json({ message: 'Lỗi khi cập nhật địa chỉ', error: err.message });
    }
};


// Xóa địa chỉ
exports.deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Xóa địa chỉ theo ID và user_id
        const address = await Address.findOneAndDelete({ _id: id, user_id: userId });
        if (!address) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        res.json({ message: 'Đã xóa địa chỉ thành công' });
    } catch (err) {
        console.error("Lỗi khi xóa địa chỉ:", err);
        res.status(500).json({ message: 'Lỗi khi xóa địa chỉ', error: err.message });
    }
};

