/**
 * Alternative Payment Controller
 * For users without cards - UPI, eSewa, Khalti, Bank Transfer
 */

const { getPlansForCountry } = require('../config/razorpay');
const { UPI_CONFIG, ESEWA_CONFIG, KHALTI_CONFIG, getBankDetails, getPaymentMethods } = require('../config/paymentGateways');
const PendingPayment = require('../models/PendingPayment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// ============================================================
// GET AVAILABLE PAYMENT METHODS
// ============================================================

// @desc    Get payment methods for user's country
// @route   GET /api/payments/methods
// @access  Public (country from query) or Private (country from user)
exports.getPaymentMethods = async (req, res) => {
  try {
    let country = req.query.country || 'IN';

    // If user is logged in, use their country
    if (req.user) {
      const user = await User.findById(req.user.id);
      country = user?.country || country;
    }

    const methods = getPaymentMethods(country);

    res.status(200).json({
      success: true,
      data: {
        country,
        methods
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// UPI PAYMENT (India)
// ============================================================

// @desc    Generate UPI payment link/QR
// @route   POST /api/payments/upi/initiate
// @access  Private
exports.initiateUpiPayment = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = await User.findById(req.user.id);

    if (user.country !== 'IN') {
      return res.status(400).json({
        success: false,
        message: 'UPI is only available in India'
      });
    }

    const plans = getPlansForCountry('IN');
    const allPlans = { ...plans.monthly, ...plans.yearly };
    const planConfig = allPlans[plan];

    if (!planConfig || plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan'
      });
    }

    // Generate order ID
    const orderId = PendingPayment.generateOrderId(user._id);
    const amount = planConfig.amount / 100; // Convert paise to rupees

    // Create pending payment record
    const pendingPayment = await PendingPayment.create({
      user: user._id,
      orderId,
      plan,
      amount,
      currency: 'INR',
      paymentMethod: 'upi',
      country: 'IN',
      status: 'pending'
    });

    // Generate UPI link and QR data
    const upiLink = UPI_CONFIG.generateUpiLink(amount, orderId, user.name);
    const qrData = UPI_CONFIG.generateQrData(amount, orderId);

    res.status(200).json({
      success: true,
      data: {
        orderId,
        amount,
        currency: 'INR',
        plan: planConfig.name,
        upiId: UPI_CONFIG.merchantUpiId,
        upiLink,
        qrData,
        expiresAt: pendingPayment.expiresAt,
        instructions: [
          `1. Open any UPI app (GPay, PhonePe, Paytm)`,
          `2. Scan QR code or use UPI ID: ${UPI_CONFIG.merchantUpiId}`,
          `3. Pay exactly ₹${amount}`,
          `4. Enter Order ID "${orderId}" in remarks`,
          `5. After payment, enter UTR/Transaction ID below`
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit UPI payment proof
// @route   POST /api/payments/upi/verify
// @access  Private
exports.submitUpiProof = async (req, res) => {
  try {
    const { orderId, utrNumber, transactionId } = req.body;

    const pendingPayment = await PendingPayment.findOne({
      orderId,
      user: req.user.id,
      status: 'pending'
    });

    if (!pendingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed'
      });
    }

    // Update with proof
    pendingPayment.proof = {
      type: 'transaction_id',
      utrNumber: utrNumber || transactionId,
      transactionId: transactionId || utrNumber
    };
    pendingPayment.status = 'under_review';
    await pendingPayment.save();

    res.status(200).json({
      success: true,
      message: 'Payment proof submitted! Your account will be activated within 2 hours.',
      data: {
        orderId,
        status: 'under_review'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// BANK TRANSFER (Both Countries)
// ============================================================

// @desc    Get bank transfer details
// @route   POST /api/payments/bank-transfer/initiate
// @access  Private
exports.initiateBankTransfer = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = await User.findById(req.user.id);
    const country = user?.country || 'IN';

    const plans = getPlansForCountry(country);
    const allPlans = { ...plans.monthly, ...plans.yearly };
    const planConfig = allPlans[plan];

    if (!planConfig || plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan'
      });
    }

    // Generate order ID
    const orderId = PendingPayment.generateOrderId(user._id);
    const amount = planConfig.amount / 100;
    const currency = country === 'NP' ? 'NPR' : 'INR';

    // Create pending payment record
    const pendingPayment = await PendingPayment.create({
      user: user._id,
      orderId,
      plan,
      amount,
      currency,
      paymentMethod: 'bank_transfer',
      country,
      status: 'pending'
    });

    // Get bank details
    const bankDetails = getBankDetails(country);

    res.status(200).json({
      success: true,
      data: {
        orderId,
        amount,
        currency,
        plan: planConfig.name,
        bankDetails: {
          ...bankDetails,
          reference: orderId // Use order ID as reference
        },
        expiresAt: pendingPayment.expiresAt,
        instructions: [
          `1. Transfer exactly ${currency === 'NPR' ? 'रू' : '₹'}${amount} to the account below`,
          `2. Use "${orderId}" as payment reference/remarks`,
          `3. After transfer, upload screenshot or enter transaction ID`,
          `4. Account will be activated within 2 hours`
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit bank transfer proof
// @route   POST /api/payments/bank-transfer/verify
// @access  Private
exports.submitBankTransferProof = async (req, res) => {
  try {
    const { orderId, transactionId, screenshotUrl, senderName } = req.body;

    const pendingPayment = await PendingPayment.findOne({
      orderId,
      user: req.user.id,
      status: 'pending'
    });

    if (!pendingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already processed'
      });
    }

    // Update with proof
    pendingPayment.proof = {
      type: screenshotUrl ? 'screenshot' : 'transaction_id',
      transactionId,
      screenshotUrl,
      senderName
    };
    pendingPayment.status = 'under_review';
    await pendingPayment.save();

    res.status(200).json({
      success: true,
      message: 'Payment proof submitted! Your account will be activated within 2 hours.',
      data: {
        orderId,
        status: 'under_review'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// ESEWA (Nepal)
// ============================================================

// @desc    Initiate eSewa payment
// @route   POST /api/payments/esewa/initiate
// @access  Private
exports.initiateEsewaPayment = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = await User.findById(req.user.id);

    if (user.country !== 'NP') {
      return res.status(400).json({
        success: false,
        message: 'eSewa is only available in Nepal'
      });
    }

    const plans = getPlansForCountry('NP');
    const allPlans = { ...plans.monthly, ...plans.yearly };
    const planConfig = allPlans[plan];

    if (!planConfig || plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan'
      });
    }

    const orderId = PendingPayment.generateOrderId(user._id);
    const amount = planConfig.amount / 100;

    // Create pending payment
    await PendingPayment.create({
      user: user._id,
      orderId,
      plan,
      amount,
      currency: 'NPR',
      paymentMethod: 'esewa',
      country: 'NP',
      status: 'pending'
    });

    // Generate eSewa form data
    const successUrl = `${process.env.FRONTEND_URL}/payment/success?method=esewa&orderId=${orderId}`;
    const failureUrl = `${process.env.FRONTEND_URL}/payment/failed?method=esewa&orderId=${orderId}`;

    const formData = ESEWA_CONFIG.generatePaymentData(amount, orderId, successUrl, failureUrl);

    res.status(200).json({
      success: true,
      data: {
        orderId,
        amount,
        currency: 'NPR',
        plan: planConfig.name,
        esewaUrl: ESEWA_CONFIG.baseUrl,
        formData,
        // Manual option (for users who prefer to pay directly)
        manualOption: {
          esewaId: process.env.ESEWA_MERCHANT_ID,
          instructions: [
            '1. Open eSewa app',
            `2. Pay रू${amount} to ID: ${process.env.ESEWA_MERCHANT_ID}`,
            `3. Add "${orderId}" in remarks`,
            '4. Submit transaction ID below'
          ]
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify eSewa payment (callback)
// @route   GET /api/payments/esewa/verify
// @access  Public
exports.verifyEsewaPayment = async (req, res) => {
  try {
    const { oid, refId } = req.query;

    const pendingPayment = await PendingPayment.findOne({ orderId: oid });

    if (!pendingPayment) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=order_not_found`);
    }

    // Verify with eSewa API (in production)
    // For now, mark as under review
    pendingPayment.proof = {
      type: 'transaction_id',
      transactionId: refId
    };
    pendingPayment.status = 'verified'; // eSewa callback means it's verified
    await pendingPayment.save();

    // Activate subscription
    await activateSubscription(pendingPayment);

    res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${oid}`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=${error.message}`);
  }
};

// ============================================================
// KHALTI (Nepal)
// ============================================================

// @desc    Initiate Khalti payment
// @route   POST /api/payments/khalti/initiate
// @access  Private
exports.initiateKhaltiPayment = async (req, res) => {
  try {
    const { plan } = req.body;
    const user = await User.findById(req.user.id);

    if (user.country !== 'NP') {
      return res.status(400).json({
        success: false,
        message: 'Khalti is only available in Nepal'
      });
    }

    const plans = getPlansForCountry('NP');
    const allPlans = { ...plans.monthly, ...plans.yearly };
    const planConfig = allPlans[plan];

    if (!planConfig || plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan'
      });
    }

    const orderId = PendingPayment.generateOrderId(user._id);
    const amount = planConfig.amount / 100;

    // Create pending payment
    await PendingPayment.create({
      user: user._id,
      orderId,
      plan,
      amount,
      currency: 'NPR',
      paymentMethod: 'khalti',
      country: 'NP',
      status: 'pending'
    });

    const returnUrl = `${process.env.FRONTEND_URL}/payment/khalti/callback?orderId=${orderId}`;

    const khaltiData = await KHALTI_CONFIG.initiatePayment(
      amount,
      orderId,
      { name: user.name, email: user.email, phone: user.phone },
      returnUrl
    );

    res.status(200).json({
      success: true,
      data: {
        orderId,
        amount,
        currency: 'NPR',
        plan: planConfig.name,
        khaltiData,
        // Manual option
        manualOption: {
          instructions: [
            '1. Open Khalti app',
            `2. Pay रू${amount} to merchant`,
            `3. Add "${orderId}" in remarks`,
            '4. Submit transaction ID below'
          ]
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Khalti payment (callback)
// @route   POST /api/payments/khalti/verify
// @access  Private
exports.verifyKhaltiPayment = async (req, res) => {
  try {
    const { orderId, pidx, transactionId } = req.body;

    const pendingPayment = await PendingPayment.findOne({
      orderId,
      user: req.user.id
    });

    if (!pendingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Store Khalti reference
    pendingPayment.proof = {
      type: 'transaction_id',
      transactionId: pidx || transactionId
    };
    pendingPayment.status = 'verified';
    await pendingPayment.save();

    // Activate subscription
    await activateSubscription(pendingPayment);

    res.status(200).json({
      success: true,
      message: 'Payment verified! Your subscription is now active.',
      data: {
        orderId,
        status: 'verified'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// USER: GET MY PENDING PAYMENTS
// ============================================================

// @desc    Get user's pending payments
// @route   GET /api/payments/my-pending
// @access  Private
exports.getMyPendingPayments = async (req, res) => {
  try {
    const payments = await PendingPayment.find({
      user: req.user.id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// ADMIN: VERIFY MANUAL PAYMENTS
// ============================================================

// @desc    Get pending payments (Admin)
// @route   GET /api/payments/pending
// @access  Private (Admin)
exports.getPendingPayments = async (req, res) => {
  try {
    const { status = 'under_review' } = req.query;

    const payments = await PendingPayment.find({ status })
      .populate('user', 'name phone email shopName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify/Approve payment (Admin)
// @route   POST /api/payments/:orderId/verify
// @access  Private (Admin)
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, rejectionReason } = req.body; // 'approve' or 'reject'

    const pendingPayment = await PendingPayment.findOne({ orderId });

    if (!pendingPayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (action === 'approve') {
      pendingPayment.status = 'verified';
      pendingPayment.verifiedBy = req.user.id;
      pendingPayment.verifiedAt = new Date();
      await pendingPayment.save();

      // Activate subscription
      await activateSubscription(pendingPayment);

      res.status(200).json({
        success: true,
        message: 'Payment verified and subscription activated!'
      });
    } else if (action === 'reject') {
      pendingPayment.status = 'rejected';
      pendingPayment.rejectionReason = rejectionReason;
      pendingPayment.verifiedBy = req.user.id;
      await pendingPayment.save();

      res.status(200).json({
        success: true,
        message: 'Payment rejected'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// HELPER: ACTIVATE SUBSCRIPTION
// ============================================================

async function activateSubscription(pendingPayment) {
  const { user: userId, plan, amount, currency } = pendingPayment;

  // Calculate subscription period
  const periodStart = new Date();
  const periodEnd = new Date();

  if (plan.includes('yearly')) {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Update or create subscription
  let subscription = await Subscription.findOne({ user: userId });

  if (subscription) {
    subscription.plan = plan;
    subscription.status = 'active';
    subscription.currentPeriodStart = periodStart;
    subscription.currentPeriodEnd = periodEnd;
    subscription.nextBillingDate = periodEnd;
    subscription.billingHistory.push({
      invoiceId: `INV_${Date.now()}`,
      razorpayPaymentId: pendingPayment.orderId,
      amount,
      currency,
      status: 'paid',
      paidAt: new Date()
    });
    await subscription.save();
  } else {
    subscription = await Subscription.create({
      user: userId,
      plan,
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
      billingHistory: [{
        invoiceId: `INV_${Date.now()}`,
        razorpayPaymentId: pendingPayment.orderId,
        amount,
        currency,
        status: 'paid',
        paidAt: new Date()
      }]
    });
  }

  // Update user
  await User.findByIdAndUpdate(userId, {
    plan,
    subscriptionStatus: 'active',
    planExpiresAt: periodEnd
  });

  return subscription;
}

// @desc    Check payment status
// @route   GET /api/payments/:orderId/status
// @access  Private
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await PendingPayment.findOne({
      orderId,
      user: req.user.id
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: payment.orderId,
        status: payment.status,
        plan: payment.plan,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt,
        rejectionReason: payment.rejectionReason
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
