const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

// جلب جميع الأدوية
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// إضافة دواء جديد
router.post('/', async (req, res) => {
  try {
    const { name, company, quantity, price, expiryDate } = req.body;
    const medicine = new Medicine({ name, company, quantity, price, expiryDate });
    await medicine.save();
    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
