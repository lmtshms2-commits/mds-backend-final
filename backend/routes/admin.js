const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware للتحقق من صلاحية الأدمن
const isAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  
  try {
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
    const deliveredOrders = await Order.countDocuments({ status: 'completed' });
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
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
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', isAdmin, async (req, res) => {
  try {
    const { isActive, verified } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive, verified }, { new: true });
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
    const orders = await Order.find().populate('pharmacy', 'name phone').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// طلبات تنتظر موافقة الأدمن
router.get('/orders/pending', isAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: 'pending' }).populate('pharmacy', 'name phone address');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// طلبات تنتظر تعيين سائق
router.get('/orders/awaiting-driver', isAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: 'admin_approved' }).populate('pharmacy', 'name phone address');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// موافقة الأدمن على الطلب
router.put('/orders/:id/approve', isAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'admin_approved',
      admin: req.user.id,
      adminApprovedAt: new Date()
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على قائمة السائقين النشطين
router.get('/drivers', isAdmin, async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver', isActive: true }).select('name phone');
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تعيين سائق للطلب
router.put('/orders/:id/assign-driver', isAdmin, async (req, res) => {
  try {
    const { driverId } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'driver_assigned',
      driver: driverId,
      driverAssignedAt: new Date()
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ تقارير الإدارة ============
router.get('/reports', isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    
    const totalOrders = await Order.countDocuments(filter);
    const completedOrders = await Order.countDocuments({ ...filter, status: 'completed' });
    const totalRevenue = await Order.aggregate([
      { $match: { ...filter, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    
    res.json({
      summary: {
        totalOrders,
        completedOrders,
        pendingOrders: totalOrders - completedOrders,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
