const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  expiryDate: { type: Date },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Medicine', MedicineSchema);
