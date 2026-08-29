const mongoose = require('mongoose');

/**
 * Condition model – a medical condition (disease/illness) with:
 *  - matched symptoms (references to Symptom docs)
 *  - recommended medicines (references to Medicine docs)
 *  - severity, description, when to see a doctor, disclaimer
 */
const conditionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    // Symptoms that strongly indicate this condition (required ≥ 1 match)
    symptoms: [
      {
        symptom: { type: mongoose.Schema.Types.ObjectId, ref: 'Symptom', required: true },
        weight: { type: Number, default: 1, min: 1, max: 5 }, // 1 = minor indicator, 5 = strong indicator
      },
    ],
    // Medicines commonly recommended for this condition
    recommendedMedicines: [
      {
        medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        note: { type: String }, // e.g. "Take with food", "Antibiotic – complete the course"
      },
    ],
    // Severity level
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild',
    },
    // General self-care tips
    selfCare: {
      type: [String],
      default: [],
    },
    // Warning signs – when to immediately seek a doctor
    warningSignsToSeeDoctor: {
      type: [String],
      default: [],
    },
    // ICD-10 code (optional, for reference)
    icdCode: { type: String },
  },
  { timestamps: true }
);

conditionSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Condition', conditionSchema);
