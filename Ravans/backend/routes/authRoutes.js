const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validateMiddleware');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  validate
], authController.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
  validate
], authController.login);

router.get('/me', protect, authController.me);

module.exports = router;
