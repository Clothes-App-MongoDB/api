const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const authAdmin = require("../middleware/authAdmin"); // Đổi middleware

// Public routes
router.post("/register", adminController.register);
router.post("/login", adminController.login);
router.post("/send-otp", adminController.sendAdminOtp);
router.post("/reset-password", adminController.resetAdminPassword);

// Protected admin-only route
router.post("/change-password", authAdmin, adminController.changePassword);

module.exports = router;
