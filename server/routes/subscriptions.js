const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPlans,
  getMySubscription,
  startTrial,
  createSubscription,
  verifyPayment,
  cancelSubscription,
  handleWebhook,
  getBillingHistory,
  checkFeatureAccess
} = require('../controllers/subscriptionController');

// Public routes
router.get('/plans', getPlans);
router.post('/webhook', handleWebhook); // Razorpay webhook (no auth)

// Protected routes (require login)
router.use(protect);

router.get('/me', getMySubscription);
router.post('/start-trial', startTrial);
router.post('/create', createSubscription);
router.post('/verify', verifyPayment);
router.post('/cancel', cancelSubscription);
router.get('/billing-history', getBillingHistory);
router.get('/check-access/:feature', checkFeatureAccess);

module.exports = router;
