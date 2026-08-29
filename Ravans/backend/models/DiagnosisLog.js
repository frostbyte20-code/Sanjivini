const mongoose = require('mongoose');

/**
 * DiagnosisLog – optional record of a symptom-check session.
 * Saves what symptoms the user entered and what conditions were returned.
 * Useful for analytics / history (only saved if user is authenticated).
 */
const diagnosisLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    symptomsEntered: { type: [String], required: true },       // raw strings the user typed
    matchedSymptomIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Symptom' }],
    conditionsReturned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Condition' }],
    sessionId: { type: String },  // anonymous session tracking
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiagnosisLog', diagnosisLogSchema);
