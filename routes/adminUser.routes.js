// routes/admin.user.route.js
const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUser.controller');

// GET /api/admin/users
router.get('/users', adminUserController.getAllUsers);

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', adminUserController.updateUserStatus);

// Optional
router.get('/users/:id', adminUserController.getUserById);
router.delete('/users/:id', adminUserController.deleteUser);

module.exports = router;
