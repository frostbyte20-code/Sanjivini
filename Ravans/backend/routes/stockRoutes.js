const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validateMiddleware');
const stockController = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.get('/', protect, admin, stockController.list);

router.post('/', protect, admin, [
  body('pharmacyId').isMongoId(),
  body('medicineId').isMongoId(),
  body('quantity').isInt({ min: 0 }),
  body('price').optional().isFloat({ min: 0 }),
  body('available').optional().isBoolean(),
  validate
], stockController.create);

router.put('/:id', protect, admin, [param('id').isMongoId(), validate], stockController.update);
router.delete('/:id', protect, admin, [param('id').isMongoId(), validate], stockController.remove);

module.exports = router;
