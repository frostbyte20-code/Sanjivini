const Symptom = require('../models/Symptom');
const Condition = require('../models/Condition');
const DiagnosisLog = require('../models/DiagnosisLog');

// ─────────────────────────────────────────────────────────────────
// GET /api/diagnosis/symptoms?q=fever
// Autocomplete: returns matching symptoms for a search query
// ─────────────────────────────────────────────────────────────────
exports.searchSymptoms = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      const all = await Symptom.find().select('name aliases').limit(50).lean();
      return res.json({ success: true, data: { symptoms: all } });
    }

    const regex = new RegExp(q, 'i');
    const symptoms = await Symptom.find({
      $or: [{ name: regex }, { aliases: regex }],
    })
      .select('name aliases')
      .limit(20)
      .lean();

    res.json({ success: true, data: { symptoms } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/diagnosis/analyze
// Body: { symptoms: ["fever", "headache", "cough"], sessionId?: string }
//
// Algorithm:
//  1. Resolve symptom strings → Symptom documents (fuzzy match)
//  2. For each Condition, compute a match score:
//       score = Σ(weight of each matched symptom)
//       relevance% = (matched symptoms / total condition symptoms) * 100
//  3. Return conditions sorted by score (descending), minimum 1 matching symptom
//  4. Optionally log the session (if user is authenticated)
// ─────────────────────────────────────────────────────────────────
exports.analyze = async (req, res, next) => {
  try {
    const rawSymptoms = req.body.symptoms;
    const sessionId   = req.body.sessionId || null;

    if (!Array.isArray(rawSymptoms) || rawSymptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one symptom in the "symptoms" array.',
      });
    }

    // Sanitise & limit input
    const inputSymptoms = rawSymptoms
      .map((s) => String(s).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 15); // max 15 symptoms per request

    // ── Step 1: Resolve symptom strings → DB docs ───────────────
    const resolvedSymptoms = [];
    for (const input of inputSymptoms) {
      const regex = new RegExp(input, 'i');
      const match = await Symptom.findOne({
        $or: [{ name: regex }, { aliases: regex }],
      }).lean();
      if (match) resolvedSymptoms.push(match);
    }

    if (resolvedSymptoms.length === 0) {
      return res.json({
        success: true,
        data: {
          conditions: [],
          matchedSymptoms: [],
          disclaimer: getDisclaimer(),
          message:
            'None of your symptoms matched our database. Try describing them differently.',
        },
      });
    }

    const matchedSymptomIds = resolvedSymptoms.map((s) => s._id);

    // ── Step 2: Fetch conditions that reference ≥ 1 matched symptom ──
    const conditions = await Condition.find({
      'symptoms.symptom': { $in: matchedSymptomIds },
    })
      .populate('symptoms.symptom', 'name')
      .populate('recommendedMedicines.medicine', 'name genericName category description')
      .lean();

    // ── Step 3: Score each condition ──────────────────────────────
    const scoredConditions = conditions
      .map((condition) => {
        let score = 0;
        let matchedCount = 0;
        const matchedSymbolNames = [];

        for (const condSymptom of condition.symptoms) {
          const sid = condSymptom.symptom?._id?.toString();
          const isMatched = matchedSymptomIds.some((id) => id.toString() === sid);
          if (isMatched) {
            score += condSymptom.weight;
            matchedCount++;
            matchedSymbolNames.push(condSymptom.symptom?.name);
          }
        }

        const totalSymptoms   = condition.symptoms.length;
        const relevancePct    = Math.round((matchedCount / totalSymptoms) * 100);
        const maxPossibleScore = condition.symptoms.reduce((sum, s) => sum + s.weight, 0);
        const confidencePct   = Math.round((score / maxPossibleScore) * 100);

        return {
          _id: condition._id,
          name: condition.name,
          description: condition.description,
          severity: condition.severity,
          icdCode: condition.icdCode,
          selfCare: condition.selfCare,
          warningSignsToSeeDoctor: condition.warningSignsToSeeDoctor,
          recommendedMedicines: condition.recommendedMedicines,
          matchedSymptoms: matchedSymbolNames,
          matchedCount,
          totalConditionSymptoms: totalSymptoms,
          relevancePct,
          confidencePct,
          score,
        };
      })
      .filter((c) => c.matchedCount > 0)
      .sort((a, b) => b.confidencePct - a.confidencePct || b.score - a.score);

    // ── Step 4: Log the session (best-effort) ────────────────────
    try {
      await DiagnosisLog.create({
        user: req.user?._id || null,
        symptomsEntered: inputSymptoms,
        matchedSymptomIds,
        conditionsReturned: scoredConditions.map((c) => c._id),
        sessionId,
      });
    } catch (_) {
      // logging failure must not block the response
    }

    res.json({
      success: true,
      data: {
        matchedSymptoms: resolvedSymptoms.map((s) => s.name),
        unmatchedSymptoms: inputSymptoms.filter(
          (s) => !resolvedSymptoms.some((r) => r.name === s || (r.aliases || []).includes(s))
        ),
        conditions: scoredConditions,
        disclaimer: getDisclaimer(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/diagnosis/conditions
// List / search all conditions (admin & public use)
// ─────────────────────────────────────────────────────────────────
exports.listConditions = async (req, res, next) => {
  try {
    const q       = (req.query.q || '').trim();
    const page    = parseInt(req.query.page, 10)  || 1;
    const limit   = parseInt(req.query.limit, 10) || 20;
    const skip    = (page - 1) * limit;

    let query = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      query = { $or: [{ name: regex }, { description: regex }] };
    }

    const [total, conditions] = await Promise.all([
      Condition.countDocuments(query),
      Condition.find(query)
        .populate('symptoms.symptom', 'name')
        .populate('recommendedMedicines.medicine', 'name genericName')
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({ success: true, data: { total, page, limit, conditions } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/diagnosis/conditions/:id
// Single condition detail
// ─────────────────────────────────────────────────────────────────
exports.getCondition = async (req, res, next) => {
  try {
    const condition = await Condition.findById(req.params.id)
      .populate('symptoms.symptom', 'name aliases')
      .populate('recommendedMedicines.medicine', 'name genericName category description')
      .lean();

    if (!condition) {
      return res.status(404).json({ success: false, message: 'Condition not found' });
    }
    res.json({ success: true, data: { condition } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/diagnosis/conditions  (Admin only)
// ─────────────────────────────────────────────────────────────────
exports.createCondition = async (req, res, next) => {
  try {
    const condition = await Condition.create(req.body);
    res.status(201).json({ success: true, data: { condition } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// PUT /api/diagnosis/conditions/:id  (Admin only)
// ─────────────────────────────────────────────────────────────────
exports.updateCondition = async (req, res, next) => {
  try {
    const condition = await Condition.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!condition) return res.status(404).json({ success: false, message: 'Condition not found' });
    res.json({ success: true, data: { condition } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// DELETE /api/diagnosis/conditions/:id  (Admin only)
// ─────────────────────────────────────────────────────────────────
exports.deleteCondition = async (req, res, next) => {
  try {
    const condition = await Condition.findByIdAndDelete(req.params.id);
    if (!condition) return res.status(404).json({ success: false, message: 'Condition not found' });
    res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/diagnosis/history  (Protected – user's own logs)
// ─────────────────────────────────────────────────────────────────
exports.getHistory = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip  = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      DiagnosisLog.countDocuments({ user: req.user._id }),
      DiagnosisLog.find({ user: req.user._id })
        .populate('matchedSymptomIds', 'name')
        .populate('conditionsReturned', 'name severity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({ success: true, data: { total, page, limit, logs } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function getDisclaimer() {
  return (
    '⚠️ MEDICAL DISCLAIMER: This tool provides general health information only and is ' +
    'NOT a substitute for professional medical advice, diagnosis, or treatment. ' +
    'Always consult a qualified healthcare provider for medical concerns. ' +
    'In an emergency, call your local emergency number immediately.'
  );
}
