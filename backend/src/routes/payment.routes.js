const router = require('express').Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  reversePayment,
} = require('../controller/payment.controller');

router.post('/', authMiddleware, createPayment);
router.get('/', authMiddleware, getPayments);
router.get('/:id', authMiddleware, getPaymentById);
router.patch('/:id', authMiddleware, updatePayment);
router.post('/:id/reverse', authMiddleware, reversePayment);

module.exports = router;