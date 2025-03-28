// backend/app/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('@app/controllers/authController');

// @route   POST api/auth/login
// @desc    Аутентификация пользователя (админа) и получение токена
// @access  Public
router.post('/login', authController.login);

module.exports = router;