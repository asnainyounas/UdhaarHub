const router = require('express').Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  createDebtor,
  getDebtors,
  getDebtorById,
  updateDebtor,
} = require('../controller/debtor.controller');

router.post('/', authMiddleware, createDebtor);
router.get('/', authMiddleware, getDebtors);
router.get('/:id', authMiddleware, getDebtorById);
router.patch('/:id', authMiddleware, updateDebtor);

module.exports = router;