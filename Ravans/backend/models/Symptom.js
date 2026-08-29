const mongoose = require('mongoose');

/**
 * Symptom model – represents a symptom keyword that maps to conditions.
 * Stored separately so the symptom list can be searched/autocompleted.
 */
const symptomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    aliases: {
      // alternate names / common spellings (e.g. "headache" → ["head pain", "migraine"])
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

symptomSchema.index({ name: 'text', aliases: 'text' });

module.exports = mongoose.model('Symptom', symptomSchema);
