const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');

// إنشاء طلب جديد (للصيدلية)
router.post('/', async (req, res) => {
  try {
    const { pharmacy, pharmacyAddress, pharmacyLocation, medicines, subtotal, deliveryFee, totalPrice, distance } = req.body;
    const order = new Order({ 
      pharmacy, pharmacyAddress, pharmacyLocation, medicines, subtotal, deliveryFee, totalPrice, distance,
      notifications: [{ message: 'تم إنشاء الطلب ويحتاج موافقة الإدارة', type: 'created' }]
    });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// موافقة الأدمن على الطلب
router.put('/:id/admin-approve', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'admin_approved',
      admin: req.body.adminId,
      adminApprovedAt: new Date(),
      $push: { notifications: { message: 'تمت موافقة الإدارة على الطلب', type: 'admin_approved' } }
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تعيين سائق للطلب
router.put('/:id/assign-driver', async (req, res) => {
  try {
    const { driverId } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'driver_assigned',
      driver: driverId,
      driverAssignedAt: new Date(),
      $push: { notifications: { message: 'تم تعيين سائق لتوصيل الطلب', type: 'driver_assigned' } }
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// السائق يبدأ التحرك
router.put('/:id/driver-on-way', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'driver_on_way',
      driverOnWayAt: new Date(),
      $push: { notifications: { message: 'السائق في طريقه إليك', type: 'driver_on_way' } }
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// السائق يؤكد التوصيل
router.put('/:id/delivered', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'delivered',
      deliveredAt: new Date(),
      $push: { notifications: { message: 'تم توصيل الطلب، يرجى تأكيد الاستلام', type: 'delivered' } }
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// الصيدلية تؤكد الاستلام
router.put('/:id/pharmacy-confirm', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'pharmacy_confirmed',
      pharmacyConfirmedAt: new Date(),
      $push: { notifications: { message: 'تم تأكيد استلام الطلب من قبل الصيدلية', type: 'pharmacy_confirmed' } }
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// اكتمال الطلب
router.put('/:id/complete', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'completed',
      $push: { notifications: { message: 'اكتمل الطلب', type: 'completed' } }
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// جلب طلبات الصيدلية مع التنبيهات
router.get('/pharmacy/:pharmacyId', async (req, res) => {
  try {
    const orders = await Order.find({ pharmacy: req.params.pharmacyId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// جلب طلبات السائق
router.get('/driver/:driverId', async (req, res) => {
  try {
    const orders = await Order.find({ driver: req.params.driverId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// جلب جميع الطلبات (للأدمن)
router.get('/all', async (req, res) => {
  try {
    const orders = await Order.find().populate('pharmacy', 'name phone').populate('driver', 'name phone').populate('admin', 'name').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// جلب التنبيهات غير المقروءة لمستخدم
router.get('/notifications/:userId/:role', async (req, res) => {
  try {
    const { userId, role } = req.params;
    let filter = {};
    if (role === 'pharmacy') filter = { pharmacy: userId };
    if (role === 'driver') filter = { driver: userId };
    
    const orders = await Order.find(filter);
    const notifications = orders.flatMap(o => o.notifications.filter(n => !n.read));
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تحديث حالة قراءة التنبيه
router.put('/notifications/read/:orderId/:notificationIndex', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    order.notifications[req.params.notificationIndex].read = true;
    await order.save();
    res.json({ message: 'تم تحديث التنبيه' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
