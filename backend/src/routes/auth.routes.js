const router = require('express').Router();
const { signup, login, logout, getMe } = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authLimiter = require('../middlewares/authRateLimit.middleware');

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);

module.exports = router;
