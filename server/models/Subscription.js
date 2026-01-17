const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  // User Reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Plan Details
  plan: {
    type: String,
    enum: ['free', 'pro', 'business', 'pro_yearly', 'business_yearly'],
    default: 'free'
  },

  // Razorpay Details
  razorpayCustomerId: {
    type: String,
    sparse: true
  },
  razorpaySubscriptionId: {
    type: String,
    sparse: true
  },
  razorpayPlanId: {
    type: String
  },

  // Subscription Status
  status: {
    type: String,
    enum: ['inactive', 'trialing', 'active', 'past_due', 'cancelled', 'expired'],
    default: 'inactive'
  },

  // Trial Information
  trialStartDate: {
    type: Date
  },
  trialEndDate: {
    type: Date
  },
  isTrialUsed: {
    type: Boolean,
    default: false
  },

  // Billing Dates
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  nextBillingDate: {
    type: Date
  },

  // Payment Method
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet']
    },
    last4: String, // Last 4 digits of card
    bank: String,  // Bank name for netbanking/UPI
    upiId: String  // UPI ID (masked)
  },

  // Billing History
  billingHistory: [{
    invoiceId: String,
    razorpayPaymentId: String,
    amount: Number,
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['paid', 'failed', 'refunded', 'pending']
    },
    paidAt: Date,
    invoiceUrl: String,
    failureReason: String
  }],

  // Cancellation Details
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },

  // Usage Tracking (for limits)
  usage: {
    customersCount: { type: Number, default: 0 },
    productsCount: { type: Number, default: 0 },
    invoicesThisMonth: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },

  // Metadata
  metadata: {
    source: String,        // 'website', 'mobile', 'referral'
    referralCode: String,
    campaignId: String,
    discountApplied: String
  }
}, {
  timestamps: true
});

// Index for quick lookups
SubscriptionSchema.index({ razorpaySubscriptionId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ trialEndDate: 1 });
SubscriptionSchema.index({ nextBillingDate: 1 });

// Check if user is on active paid plan
SubscriptionSchema.methods.isActive = function() {
  return ['trialing', 'active'].includes(this.status);
};

// Check if user is in trial period
SubscriptionSchema.methods.isInTrial = function() {
  if (this.status !== 'trialing') return false;
  return new Date() < new Date(this.trialEndDate);
};

// Get days remaining in trial
SubscriptionSchema.methods.getTrialDaysRemaining = function() {
  if (!this.isInTrial()) return 0;
  const now = new Date();
  const end = new Date(this.trialEndDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Check if user can use a feature based on plan limits
SubscriptionSchema.methods.canUseFeature = function(feature, currentCount) {
  const { PLANS, YEARLY_PLANS } = require('../config/razorpay');
  const allPlans = { ...PLANS, ...YEARLY_PLANS };
  const planConfig = allPlans[this.plan] || PLANS.free;
  const limit = planConfig.limits[feature];

  // -1 means unlimited
  if (limit === -1) return true;
  return currentCount < limit;
};

// Reset monthly usage counters
SubscriptionSchema.methods.resetMonthlyUsage = function() {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);

  // Reset if it's a new month
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.invoicesThisMonth = 0;
    this.usage.lastResetDate = now;
  }
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);
