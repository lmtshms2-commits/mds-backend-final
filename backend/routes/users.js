const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============ المسارات الثابتة أولاً (بدون :id) ============

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { phone, password, role } = req.body;
    
    const user = await User.findOne({ phone, role });
    if (!user) {
      return res.status(400).json({ message: 'رقم الجوال أو الدور غير صحيح' });
    }
    
    if (!user.isActive) {
      return res.status(400).json({ message: 'الحساب غير مفعل، يرجى التواصل مع الإدارة' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'كلمة السر خطأ' });
    }
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        address: user.address,
        location: user.location
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تسجيل مستخدم جديد
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, address, location, role, password, commercialRegister, licenseNumber, idNumber } = req.body;
    
    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'رقم الجوال مسجل مسبقاً' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = {
      name,
      phone,
      email,
      address,
      location: location || { lat: 0, lng: 0 },
      role,
      password: hashedPassword,
      verified: false,
      isActive: false  // يحتاج موافقة الأدمن
    };
    
    // إضافة معلومات إضافية حسب الدور
    if (role === 'company') userData.commercialRegister = commercialRegister;
    if (role === 'pharmacy') userData.licenseNumber = licenseNumber;
    if (role === 'driver') userData.idNumber = idNumber;
    
    const user = new User(userData);
    await user.save();
    
    res.status(201).json({
      message: 'تم التسجيل بنجاح، في انتظار موافقة الإدارة',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تحديث موقع المستخدم
router.put('/location/:id', async (req, res) => {
  try {
    const { location, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { location, address },
      { new: true }
    );
    res.json({ message: 'تم تحديث الموقع', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ المسارات الديناميكية (التي تحتوي على :id) في الآخر ============

// الحصول على معلومات المستخدم
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
