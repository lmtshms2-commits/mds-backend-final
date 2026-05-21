const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// استيراد النماذج
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const Order = require('./models/Order');

// استيراد المسارات
const userRoutes = require('./routes/users');
const medicineRoutes = require('./routes/medicines');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// استخدام المسارات
app.use('/api/users', userRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

console.log('📡 الرابط:', process.env.MONGO_URI);

// الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅✅✅ قاعدة البيانات متصلة بنجاح ✅✅✅');
  })
  .catch(err => {
    console.log('❌❌❌ فشل الاتصال بقاعدة البيانات ❌❌❌');
    console.log('الخطأ:', err.message);
  });

// نقطة البداية
app.get('/', (req, res) => {
  res.json({
    message: '💊 M.D.S pharmacies API',
    version: '2.0.0',
    status: 'online',
    endpoints: {
      users: '/api/users',
      medicines: '/api/medicines',
      orders: '/api/orders',
      admin: '/api/admin'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 M.D.S pharmacies API شغال على http://localhost:${PORT}`);
});
