const router = require('express').Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  getSummary,
  getDebtorsList,
  getOverdueDebtors,
  getRecentActivity,
  getUpcomingDueDates
} = require('../controllers/dashboard.controller');

router.get('/summary', authMiddleware, getSummary);
router.get('/debtors', authMiddleware, getDebtorsList);
router.get('/overdue', authMiddleware, getOverdueDebtors);
router.get('/recent-activity', authMiddleware, getRecentActivity);
router.get('/upcoming', authMiddleware, getUpcomingDueDates);

module.exports = router;
