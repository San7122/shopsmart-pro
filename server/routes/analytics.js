const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getTransactionAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/transactions', getTransactionAnalytics);
router.get('/inventory', getInventoryAnalytics);
router.get('/customers', getCustomerAnalytics);

module.exports = router;
