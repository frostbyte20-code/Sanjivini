const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    description: { type: String },
  },
  { timestamps: true }
);

// Text index for efficient searching
medicineSchema.index({ name: 'text', genericName: 'text', category: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
