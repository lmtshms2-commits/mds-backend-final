const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

// Middleware للتحقق من صلاحية الأدمن
const isAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user.role !== 'admin') return res.status(403).json({ message: 'ليس لديك صلاحية' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'خطأ في التوثيق' });
  }
};

// ============ إحصائيات النظام ============
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const totalPharmacies = await User.countDocuments({ role: 'pharmacy' });
    const totalCompanies = await User.countDocuments({ role: 'company' });
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const totalMedicines = await Medicine.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const totalRevenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]);
    
    res.json({
      totalPharmacies,
      totalCompanies,
      totalDrivers,
      totalMedicines,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ إدارة المستخدمين ============
router.get('/users', isAdmin, async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive) filter.isActive = isActive === 'true';
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', isAdmin, async (req, res) => {
  try {
    const { name, phone, email, address, role, password, commercialRegister, licenseNumber, idNumber, notes } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      name, phone, email, address, role, 
      password: hashedPassword, 
      commercialRegister, licenseNumber, idNumber, notes,
      verified: true 
    });
    await user.save();
    res.status(201).json({ message: 'تم إضافة المستخدم', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', isAdmin, async (req, res) => {
  try {
    const { name, phone, email, address, isActive, role, commercialRegister, licenseNumber, idNumber, notes } = req.body;
    const updateData = { name, phone, email, address, isActive, role, commercialRegister, licenseNumber, idNumber, notes };
    if (req.body.password) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ message: 'تم تحديث المستخدم', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف المستخدم' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ إدارة الأدوية ============
router.get('/medicines', isAdmin, async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ createdAt: -1 });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/medicines/:id', isAdmin, async (req, res) => {
  try {
    const { name, company, quantity, price, expiryDate } = req.body;
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, 
      { name, company, quantity, price, expiryDate }, { new: true });
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/medicines/:id', isAdmin, async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم حذف الدواء' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ إدارة الطلبات ============
router.get('/orders', isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('pharmacy', 'name phone').populate('driver', 'name phone').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/orders/:id', isAdmin, async (req, res) => {
  try {
    const { status, driver } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status, driver }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ إحصائيات مفصلة ============
router.get('/statistics', isAdmin, async (req, res) => {
  try {
    const monthlyOrders = await Order.aggregate([
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 }, total: { $sum: '$totalPrice' } } }
    ]);
    const topMedicines = await Order.aggregate([
      { $unwind: '$medicines' },
      { $group: { _id: '$medicines.name', totalQuantity: { $sum: '$medicines.quantity' } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);
    res.json({ monthlyOrders, topMedicines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
