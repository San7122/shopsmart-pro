const crypto = require('crypto');
const { razorpay, PLANS, YEARLY_PLANS, getPlansForCountry, COUNTRIES, PAYMENT_GATEWAYS } = require('../config/razorpay');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// @desc    Get all available plans (with country-based pricing)
// @route   GET /api/subscriptions/plans
// @route   GET /api/subscriptions/plans?country=NP
// @access  Public
exports.getPlans = async (req, res) => {
  try {
    // Get country from query param, user profile, or default to IN
    let country = req.query.country || 'IN';

    // If user is logged in, use their country
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user?.country) {
        country = user.country;
      }
    }

    // Validate country
    if (!COUNTRIES[country]) {
      country = 'IN';
    }

    const plans = getPlansForCountry(country);
    const countryConfig = COUNTRIES[country];
    const paymentInfo = PAYMENT_GATEWAYS[country];

    res.status(200).json({
      success: true,
      data: {
        country: countryConfig,
        monthly: plans.monthly,
        yearly: plans.yearly,
        paymentMethods: paymentInfo,
        supportedCountries: Object.values(COUNTRIES).map(c => ({
          code: c.code,
          name: c.name,
          currency: c.currency,
          currencySymbol: c.currencySymbol
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user's subscription
// @route   GET /api/subscriptions/me
// @access  Private
exports.getMySubscription = async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ user: req.user.id });

    // If no subscription exists, create a free one
    if (!subscription) {
      subscription = await Subscription.create({
        user: req.user.id,
        plan: 'free',
        status: 'active'
      });
    }

    // Get plan details
    const allPlans = { ...PLANS, ...YEARLY_PLANS };
    const planDetails = allPlans[subscription.plan] || PLANS.free;

    res.status(200).json({
      success: true,
      data: {
        subscription,
        planDetails,
        trialDaysRemaining: subscription.getTrialDaysRemaining(),
        isActive: subscription.isActive(),
        isInTrial: subscription.isInTrial()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start free trial (NO CARD REQUIRED - just activates trial)
// @route   POST /api/subscriptions/start-trial
// @access  Private
exports.startTrial = async (req, res) => {
  try {
    const { plan } = req.body; // 'pro' or 'business'

    if (!['pro', 'business'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Choose pro or business'
      });
    }

    // Check if user already used trial
    let subscription = await Subscription.findOne({ user: req.user.id });

    if (subscription && subscription.isTrialUsed) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your free trial'
      });
    }

    const user = await User.findById(req.user.id);
    const planConfig = PLANS[plan];

    // Calculate trial dates (NO CARD REQUIRED)
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + (planConfig.trialDays || 30));

    // Update or create subscription record (without Razorpay - card collected later)
    if (subscription) {
      subscription.plan = plan;
      subscription.status = 'trialing';
      subscription.trialStartDate = trialStartDate;
      subscription.trialEndDate = trialEndDate;
      subscription.isTrialUsed = true;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        user: req.user.id,
        plan,
        status: 'trialing',
        trialStartDate,
        trialEndDate,
        isTrialUsed: true
      });
    }

    // Update user's plan
    user.plan = plan;
    user.subscriptionStatus = 'trialing';
    user.trialEndsAt = trialEndDate;
    await user.save();

    res.status(200).json({
      success: true,
      message: `🎉 ${planConfig.trialDays || 30}-day free trial started! No payment required.`,
      data: {
        subscription,
        trialEndsAt: trialEndDate,
        daysRemaining: planConfig.trialDays || 30
      }
    });
  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start trial with card (OLD METHOD - for users who want auto-renewal)
// @route   POST /api/subscriptions/start-trial-with-card
// @access  Private
exports.startTrialWithCard = async (req, res) => {
  try {
    const { plan } = req.body; // 'pro' or 'business'

    if (!['pro', 'business'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Choose pro or business'
      });
    }

    // Check if user already used trial
    let subscription = await Subscription.findOne({ user: req.user.id });

    if (subscription && subscription.isTrialUsed) {
      return res.status(400).json({
        success: false,
        message: 'You have already used your free trial'
      });
    }

    const user = await User.findById(req.user.id);
    const planConfig = PLANS[plan];

    // Create Razorpay customer if not exists
    let customerId = subscription?.razorpayCustomerId;

    if (!customerId) {
      const customer = await razorpay.customers.create({
        name: user.name,
        email: user.email || `${user.phone}@shopsmart.app`,
        contact: user.phone,
        notes: {
          userId: user._id.toString(),
          shopName: user.shopName
        }
      });
      customerId = customer.id;
    }

    // Create Razorpay subscription with trial
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: process.env[`RAZORPAY_PLAN_${plan.toUpperCase()}`], // Set in .env
      customer_id: customerId,
      total_count: 12, // 12 billing cycles
      customer_notify: 1,
      start_at: Math.floor(Date.now() / 1000) + (planConfig.trialDays * 24 * 60 * 60), // Start billing after trial
      notes: {
        userId: user._id.toString(),
        plan: plan
      }
    });

    // Calculate trial dates
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + planConfig.trialDays);

    // Update or create subscription record
    if (subscription) {
      subscription.plan = plan;
      subscription.status = 'trialing';
      subscription.razorpayCustomerId = customerId;
      subscription.razorpaySubscriptionId = razorpaySubscription.id;
      subscription.trialStartDate = trialStartDate;
      subscription.trialEndDate = trialEndDate;
      subscription.isTrialUsed = true;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        user: req.user.id,
        plan,
        status: 'trialing',
        razorpayCustomerId: customerId,
        razorpaySubscriptionId: razorpaySubscription.id,
        trialStartDate,
        trialEndDate,
        isTrialUsed: true
      });
    }

    // Update user's plan
    user.plan = plan;
    user.subscriptionStatus = 'trialing';
    user.trialEndsAt = trialEndDate;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${planConfig.trialDays}-day free trial started!`,
      data: {
        subscription,
        razorpaySubscriptionId: razorpaySubscription.id,
        trialEndsAt: trialEndDate,
        shortUrl: razorpaySubscription.short_url // Payment link for after trial
      }
    });
  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create subscription (without trial - direct payment)
// @route   POST /api/subscriptions/create
// @access  Private
exports.createSubscription = async (req, res) => {
  try {
    const { plan } = req.body; // 'pro', 'business', 'pro_yearly', 'business_yearly'

    const allPlans = { ...PLANS, ...YEARLY_PLANS };
    if (!allPlans[plan] || plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected'
      });
    }

    const user = await User.findById(req.user.id);
    const planConfig = allPlans[plan];

    // Create Razorpay order for immediate payment
    const order = await razorpay.orders.create({
      amount: planConfig.amount,
      currency: planConfig.currency,
      receipt: `order_${user._id}_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        plan: plan
      }
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: planConfig.amount,
        currency: planConfig.currency,
        plan: planConfig,
        keyId: process.env.RAZORPAY_KEY_ID // For frontend
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify payment and activate subscription
// @route   POST /api/subscriptions/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Get payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Calculate subscription period
    const allPlans = { ...PLANS, ...YEARLY_PLANS };
    const planConfig = allPlans[plan];
    const periodStart = new Date();
    const periodEnd = new Date();

    if (plan.includes('yearly')) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update subscription
    let subscription = await Subscription.findOne({ user: req.user.id });

    if (subscription) {
      subscription.plan = plan;
      subscription.status = 'active';
      subscription.currentPeriodStart = periodStart;
      subscription.currentPeriodEnd = periodEnd;
      subscription.nextBillingDate = periodEnd;
      subscription.paymentMethod = {
        type: payment.method,
        last4: payment.card?.last4,
        bank: payment.bank
      };
      subscription.billingHistory.push({
        invoiceId: `INV_${Date.now()}`,
        razorpayPaymentId: razorpay_payment_id,
        amount: payment.amount / 100,
        status: 'paid',
        paidAt: new Date()
      });
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        user: req.user.id,
        plan,
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
        paymentMethod: {
          type: payment.method,
          last4: payment.card?.last4,
          bank: payment.bank
        },
        billingHistory: [{
          invoiceId: `INV_${Date.now()}`,
          razorpayPaymentId: razorpay_payment_id,
          amount: payment.amount / 100,
          status: 'paid',
          paidAt: new Date()
        }]
      });
    }

    // Update user
    const user = await User.findById(req.user.id);
    user.plan = plan;
    user.subscriptionStatus = 'active';
    user.planExpiresAt = periodEnd;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${planConfig.name} activated successfully!`,
      data: {
        subscription,
        expiresAt: periodEnd
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason, cancelImmediately = false } = req.body;

    const subscription = await Subscription.findOne({ user: req.user.id });

    if (!subscription || subscription.plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'No active subscription to cancel'
      });
    }

    // Cancel on Razorpay if subscription exists
    if (subscription.razorpaySubscriptionId) {
      await razorpay.subscriptions.cancel(
        subscription.razorpaySubscriptionId,
        cancelImmediately
      );
    }

    if (cancelImmediately) {
      subscription.status = 'cancelled';
      subscription.plan = 'free';
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;
    await subscription.save();

    // Update user
    const user = await User.findById(req.user.id);
    if (cancelImmediately) {
      user.plan = 'free';
      user.subscriptionStatus = 'cancelled';
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: cancelImmediately
        ? 'Subscription cancelled immediately'
        : `Subscription will cancel at end of billing period (${subscription.currentPeriodEnd.toLocaleDateString()})`,
      data: { subscription }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle Razorpay webhooks
// @route   POST /api/subscriptions/webhook
// @access  Public (verified by signature)
exports.handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log('Webhook received:', event);

    switch (event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(payload.subscription.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
        break;

      case 'subscription.pending':
        await handleSubscriptionPending(payload.subscription.entity);
        break;

      case 'subscription.halted':
        await handleSubscriptionHalted(payload.subscription.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.subscription.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Webhook handlers
async function handleSubscriptionActivated(razorpaySubscription) {
  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: razorpaySubscription.id
  });

  if (subscription) {
    subscription.status = 'active';
    await subscription.save();

    await User.findByIdAndUpdate(subscription.user, {
      subscriptionStatus: 'active'
    });
  }
}

async function handleSubscriptionCharged(razorpaySubscription, payment) {
  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: razorpaySubscription.id
  });

  if (subscription) {
    subscription.status = 'active';
    subscription.currentPeriodStart = new Date(razorpaySubscription.current_start * 1000);
    subscription.currentPeriodEnd = new Date(razorpaySubscription.current_end * 1000);
    subscription.nextBillingDate = new Date(razorpaySubscription.charge_at * 1000);

    subscription.billingHistory.push({
      invoiceId: `INV_${Date.now()}`,
      razorpayPaymentId: payment.id,
      amount: payment.amount / 100,
      status: 'paid',
      paidAt: new Date()
    });

    await subscription.save();

    await User.findByIdAndUpdate(subscription.user, {
      subscriptionStatus: 'active',
      planExpiresAt: subscription.currentPeriodEnd
    });
  }
}

async function handleSubscriptionPending(razorpaySubscription) {
  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: razorpaySubscription.id
  });

  if (subscription) {
    subscription.status = 'past_due';
    await subscription.save();

    await User.findByIdAndUpdate(subscription.user, {
      subscriptionStatus: 'past_due'
    });
  }
}

async function handleSubscriptionHalted(razorpaySubscription) {
  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: razorpaySubscription.id
  });

  if (subscription) {
    subscription.status = 'expired';
    subscription.plan = 'free';
    await subscription.save();

    await User.findByIdAndUpdate(subscription.user, {
      plan: 'free',
      subscriptionStatus: 'expired'
    });
  }
}

async function handleSubscriptionCancelled(razorpaySubscription) {
  const subscription = await Subscription.findOne({
    razorpaySubscriptionId: razorpaySubscription.id
  });

  if (subscription) {
    subscription.status = 'cancelled';
    subscription.plan = 'free';
    await subscription.save();

    await User.findByIdAndUpdate(subscription.user, {
      plan: 'free',
      subscriptionStatus: 'cancelled'
    });
  }
}

async function handlePaymentFailed(payment) {
  if (payment.notes?.userId) {
    const subscription = await Subscription.findOne({ user: payment.notes.userId });

    if (subscription) {
      subscription.billingHistory.push({
        razorpayPaymentId: payment.id,
        amount: payment.amount / 100,
        status: 'failed',
        failureReason: payment.error_description
      });
      await subscription.save();
    }
  }
}

// @desc    Get billing history
// @route   GET /api/subscriptions/billing-history
// @access  Private
exports.getBillingHistory = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user.id });

    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    res.status(200).json({
      success: true,
      data: subscription.billingHistory.sort((a, b) =>
        new Date(b.paidAt) - new Date(a.paidAt)
      )
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check feature access
// @route   GET /api/subscriptions/check-access/:feature
// @access  Private
exports.checkFeatureAccess = async (req, res) => {
  try {
    const { feature } = req.params;

    const subscription = await Subscription.findOne({ user: req.user.id });

    if (!subscription) {
      // Return free plan limits
      const limit = PLANS.free.limits[feature];
      return res.status(200).json({
        success: true,
        data: {
          hasAccess: true,
          limit: limit,
          isUnlimited: limit === -1
        }
      });
    }

    const allPlans = { ...PLANS, ...YEARLY_PLANS };
    const planConfig = allPlans[subscription.plan] || PLANS.free;
    const limit = planConfig.limits[feature];

    res.status(200).json({
      success: true,
      data: {
        hasAccess: subscription.isActive(),
        limit: limit,
        isUnlimited: limit === -1,
        currentUsage: subscription.usage[feature] || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
