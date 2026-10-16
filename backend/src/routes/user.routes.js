const router = require('express').Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { updateProfile } = require('../controllers/user.controller');

router.patch('/me', authMiddleware, updateProfile);

module.exports = router;
