const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getPaymentMethods,
  initiateUpiPayment,
  submitUpiProof,
  initiateBankTransfer,
  submitBankTransferProof,
  initiateEsewaPayment,
  verifyEsewaPayment,
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  verifyPayment,
  getPendingPayments,
  getMyPendingPayments
} = require('../controllers/altPaymentController');

// Public routes
router.get('/methods', getPaymentMethods);

// Protected routes - User
router.use(protect);

// UPI Payment (India)
router.post('/upi/initiate', initiateUpiPayment);
router.post('/upi/submit-proof', submitUpiProof);

// Bank Transfer (India & Nepal)
router.post('/bank-transfer/initiate', initiateBankTransfer);
router.post('/bank-transfer/submit-proof', submitBankTransferProof);

// eSewa Payment (Nepal)
router.post('/esewa/initiate', initiateEsewaPayment);
router.post('/esewa/verify', verifyEsewaPayment);

// Khalti Payment (Nepal)
router.post('/khalti/initiate', initiateKhaltiPayment);
router.post('/khalti/verify', verifyKhaltiPayment);

// User's pending payments
router.get('/my-pending', getMyPendingPayments);

// Admin routes
router.get('/pending', authorize('admin'), getPendingPayments);
router.post('/verify/:orderId', authorize('admin'), verifyPayment);

module.exports = router;
