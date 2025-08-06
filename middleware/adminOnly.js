// middleware/adminOnly.js
module.exports = (req, res, next) => {
  if (req.user?.role !== 0) {
    return res.status(403).json({ message: 'Chỉ admin mới được truy cập' });
  }
  next();
};
