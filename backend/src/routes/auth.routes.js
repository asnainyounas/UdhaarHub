const router = require('express').Router();
const { signup, login, logout } = require('../controller/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);

module.exports = router;
