const express = require('express');
const router  = express.Router();
const { body, query, param } = require('express-validator');
const { validate }    = require('../middleware/validateMiddleware');
const { protect }     = require('../middleware/authMiddleware');
const { admin }       = require('../middleware/adminMiddleware');
const ctrl = require('../controllers/diagnosisController');

// ── Public routes ──────────────────────────────────────────────────

// GET /api/diagnosis/symptoms?q=fever
// Symptom autocomplete
router.get(
  '/symptoms',
  [query('q').optional().isString().trim(), validate],
  ctrl.searchSymptoms
);

// POST /api/diagnosis/analyze
// Core diagnosis endpoint – accepts symptom list, returns conditions
router.post(
  '/analyze',
  [
    body('symptoms')
      .isArray({ min: 1, max: 15 })
      .withMessage('symptoms must be a non-empty array (max 15)'),
    body('symptoms.*')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Each symptom must be a non-empty string'),
    body('sessionId').optional().isString(),
    validate,
  ],
  // optionally attach user if token is present (not required)
  (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return protect(req, res, () => next());
    }
    next();
  },
  ctrl.analyze
);

// GET /api/diagnosis/conditions?q=flu&page=1&limit=20
router.get(
  '/conditions',
  [
    query('q').optional().isString().trim(),
    query('page').optional().toInt(),
    query('limit').optional().toInt(),
    validate,
  ],
  ctrl.listConditions
);

// GET /api/diagnosis/conditions/:id
router.get(
  '/conditions/:id',
  [param('id').isMongoId(), validate],
  ctrl.getCondition
);

// ── Protected – own history ────────────────────────────────────────

// GET /api/diagnosis/history
router.get('/history', protect, ctrl.getHistory);

// ── Admin-only CRUD on conditions ──────────────────────────────────

// POST /api/diagnosis/conditions
router.post(
  '/conditions',
  protect,
  admin,
  [
    body('name').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('severity').optional().isIn(['mild', 'moderate', 'severe']),
    body('symptoms').optional().isArray(),
    body('recommendedMedicines').optional().isArray(),
    validate,
  ],
  ctrl.createCondition
);

// PUT /api/diagnosis/conditions/:id
router.put(
  '/conditions/:id',
  protect,
  admin,
  [param('id').isMongoId(), validate],
  ctrl.updateCondition
);

// DELETE /api/diagnosis/conditions/:id
router.delete(
  '/conditions/:id',
  protect,
  admin,
  [param('id').isMongoId(), validate],
  ctrl.deleteCondition
);

module.exports = router;
