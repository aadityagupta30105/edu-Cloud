// routes/auth.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['student', 'teacher', 'admin']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, authController.register);
router.post('/login',    loginValidation,    authController.login);
router.get('/me',        protect,            authController.getMe);
router.put('/profile',   protect,            authController.updateProfile);

module.exports = router;