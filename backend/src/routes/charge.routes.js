const router = require('express').Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  createCharge,
  getCharges,
  getChargeById,
  updateCharge,
  reverseCharge,
} = require('../controller/charge.controller');

router.post('/', authMiddleware, createCharge);
router.get('/', authMiddleware, getCharges);
router.get('/:id', authMiddleware, getChargeById);
router.patch('/:id', authMiddleware, updateCharge);
router.post('/:id/reverse', authMiddleware, reverseCharge);

module.exports = router;