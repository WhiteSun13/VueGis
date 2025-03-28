const express = require('express');
const router = express.Router();
const authMiddleware = require('@app/middleware/authMiddleware');

// @route   GET api/admin/check-auth
// @desc    Проверка, действителен ли токен пользователя
// @access  Private (требует действительный токен)
router.get('/check-auth', authMiddleware, (req, res) => {
  // Если middleware authMiddleware успешно выполнился,
  // значит токен действителен. Мы можем вернуть информацию о пользователе.
  res.json({ user: req.user });
});

// Сюда можно будет добавлять другие маршруты, требующие прав администратора
// Например:
// router.post('/points', authMiddleware, pointsController.createPoint);
// router.put('/points/:id', authMiddleware, pointsController.updatePoint);
// router.delete('/points/:id', authMiddleware, pointsController.deletePoint);

module.exports = router;