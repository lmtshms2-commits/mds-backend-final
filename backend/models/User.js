const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  },
  role: { 
    type: String, 
    enum: ['admin', 'company', 'pharmacy', 'driver'],
    required: true 
  },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  // معلومات إضافية حسب الدور
  commercialRegister: { type: String, default: '' }, // سجل تجاري للشركات
  licenseNumber: { type: String, default: '' }, // رخصة للصيدليات
  idNumber: { type: String, default: '' }, // رقم هوية للسائقين
  notes: { type: String, default: '' }
});

module.exports = mongoose.model('User', UserSchema);
