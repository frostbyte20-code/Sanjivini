const mongoose = require('mongoose');

const pharmacyStockSchema = new mongoose.Schema(
  {
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate pharmacy + medicine
pharmacyStockSchema.index({ pharmacy: 1, medicine: 1 }, { unique: true });

module.exports = mongoose.model('PharmacyStock', pharmacyStockSchema);
