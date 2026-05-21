const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// إنشاء طلب جديد
router.post('/', async (req, res) => {
  try {
    const { pharmacy, pharmacyAddress, pharmacyLocation, medicines, subtotal, deliveryFee, totalPrice, distance } = req.body;
    const order = new Order({
      pharmacy,
      pharmacyAddress,
      pharmacyLocation,
      medicines,
      subtotal,
      deliveryFee,
      totalPrice,
      distance,
      status: 'pending'
    });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// جلب طلبات صيدلية معينة
router.get('/pharmacy/:pharmacyId', async (req, res) => {
  try {
    const orders = await Order.find({ pharmacy: req.params.pharmacyId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// جلب جميع الطلبات
router.get('/all', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// السائق يبدأ التحرك
router.put('/:id/driver-on-way', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, {
      status: 'driver_on_way',
      driverOnWayAt: new Date()
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
      deliveredAt: new Date()
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
      pharmacyConfirmedAt: new Date()
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
      status: 'completed'
    }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
