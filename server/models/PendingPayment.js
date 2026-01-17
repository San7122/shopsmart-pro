/**
 * Pending Payment Model
 * For tracking manual payments (Bank Transfer, UPI screenshot, etc.)
 * Admin verifies and activates subscription
 */

const mongoose = require('mongoose');

const PendingPaymentSchema = new mongoose.Schema({
  // User Reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Order Details
  orderId: {
    type: String,
    required: true,
    unique: true
  },

  // Plan Details
  plan: {
    type: String,
    enum: ['pro', 'business', 'pro_yearly', 'business_yearly'],
    required: true
  },

  // Payment Details
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['INR', 'NPR'],
    default: 'INR'
  },

  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank_transfer', 'esewa', 'khalti', 'other'],
    required: true
  },

  // Payment Proof
  proof: {
    type: {
      type: String,
      enum: ['screenshot', 'transaction_id', 'voucher']
    },
    transactionId: String,
    screenshotUrl: String,
    utrNumber: String, // UPI Transaction Reference
    senderName: String,
    senderPhone: String,
    notes: String
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },

  // Verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin user
  },
  verifiedAt: Date,
  rejectionReason: String,

  // Expiry (pending payments expire after 24 hours)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  },

  // Country
  country: {
    type: String,
    enum: ['IN', 'NP'],
    default: 'IN'
  }
}, {
  timestamps: true
});

// Index for quick lookups
PendingPaymentSchema.index({ orderId: 1 });
PendingPaymentSchema.index({ user: 1, status: 1 });
PendingPaymentSchema.index({ status: 1, expiresAt: 1 });

// Generate unique order ID
PendingPaymentSchema.statics.generateOrderId = function (userId) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `SS${timestamp}${random}`.toUpperCase();
};

module.exports = mongoose.model('PendingPayment', PendingPaymentSchema);
