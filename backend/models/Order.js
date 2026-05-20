const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pharmacyAddress: { type: String, default: '' },
  pharmacyLocation: { lat: { type: Number, default: 0 }, lng: { type: Number, default: 0 } },
  medicines: [{
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    name: String,
    quantity: Number,
    price: Number,
    note: String
  }],
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
  distance: { type: Number, default: 0 },
  
  // حالات الطلب الجديدة
  status: {
    type: String,
    enum: ['pending', 'admin_approved', 'driver_assigned', 'driver_on_way', 'delivered', 'pharmacy_confirmed', 'completed'],
    default: 'pending'
  },
  
  // التواريخ
  createdAt: { type: Date, default: Date.now },
  adminApprovedAt: { type: Date },
  driverAssignedAt: { type: Date },
  driverOnWayAt: { type: Date },
  deliveredAt: { type: Date },
  pharmacyConfirmedAt: { type: Date },
  
  // الموظفون المسؤولون
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // التنبيهات
  notifications: [{
    message: String,
    type: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  
  driverNote: { type: String, default: '' },
  pharmacyNote: { type: String, default: '' }
});

module.exports = mongoose.model('Order', OrderSchema);
