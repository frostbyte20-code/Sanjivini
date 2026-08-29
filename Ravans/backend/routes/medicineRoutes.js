const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');
const { validate } = require('../middleware/validateMiddleware');
const medicineController = require('../controllers/medicineController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.get('/search', [
  query('q').optional().isString(),
  query('page').optional().toInt(),
  query('limit').optional().toInt(),
  validate
], medicineController.search);

router.get('/:id', [param('id').isMongoId(), validate], medicineController.getById);

// Admin routes
router.post('/', protect, admin, [
  body('name').notEmpty(),
  validate
], medicineController.create);

router.put('/:id', protect, admin, [param('id').isMongoId(), validate], medicineController.update);
router.delete('/:id', protect, admin, [param('id').isMongoId(), validate], medicineController.remove);

module.exports = router;
