const router = require('express').Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { getCompany, updateCompany } = require('../controllers/company.controller');

router.get('/:id', authMiddleware, getCompany);
router.patch('/:id', authMiddleware, updateCompany);

module.exports = router;
