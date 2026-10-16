const router = require('express').Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  createDebtor,
  getDebtors,
  getDebtorById,
  getDebtorLedger,
  updateDebtor,
  updateDebtorStatus,
} = require('../controllers/debtor.controller');

router.post('/', authMiddleware, createDebtor);
router.get('/', authMiddleware, getDebtors);
router.get('/:id/ledger', authMiddleware, getDebtorLedger);
router.get('/:id', authMiddleware, getDebtorById);
router.patch('/:id/status', authMiddleware, updateDebtorStatus);
router.patch('/:id', authMiddleware, updateDebtor);


module.exports = router;

