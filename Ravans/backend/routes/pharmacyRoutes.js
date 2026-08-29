const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');
const { validate } = require('../middleware/validateMiddleware');
const pharmacyController = require('../controllers/pharmacyController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.get('/nearby', [
  query('medicine').notEmpty().withMessage('medicine is required'),
  query('lat').notEmpty().withMessage('lat is required').isFloat({ min: -90, max: 90 }).toFloat(),
  query('lng').notEmpty().withMessage('lng is required').isFloat({ min: -180, max: 180 }).toFloat(),
  query('radius').optional().isFloat({ gt: 0 }).toFloat(),
  query('page').optional().toInt(),
  query('limit').optional().toInt(),
  validate
], pharmacyController.nearby);

router.get('/:id', [param('id').isMongoId(), validate], pharmacyController.getById);
router.get('/:id/stock', [param('id').isMongoId(), validate], pharmacyController.getStock);

// Admin routes
router.post('/', protect, admin, [
  body('name').notEmpty(),
  body('address').notEmpty(),
  body('city').notEmpty(),
  body('state').notEmpty(),
  body('pincode').notEmpty(),
  body('phone').notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }).toFloat(),
  body('longitude').isFloat({ min: -180, max: 180 }).toFloat(),
  validate
], pharmacyController.create);

router.put('/:id', protect, admin, [param('id').isMongoId(), validate], pharmacyController.update);
router.delete('/:id', protect, admin, [param('id').isMongoId(), validate], pharmacyController.remove);

module.exports = router;
