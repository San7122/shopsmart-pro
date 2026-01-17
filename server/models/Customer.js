const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  // Owner reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Customer Info
  name: {
    type: String,
    required: [true, 'Please provide customer name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please provide valid Indian phone number']
  },
  email: {
    type: String,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide valid email']
  },
  address: {
    type: String,
    trim: true
  },
  image: {
    type: String
  },

  // Balance Info
  balance: {
    type: Number,
    default: 0  // Positive = Customer owes shop, Negative = Shop owes customer
  },
  totalCredit: {
    type: Number,
    default: 0  // Total credit given
  },
  totalPaid: {
    type: Number,
    default: 0  // Total amount received
  },

  // Credit Settings
  creditLimit: {
    type: Number,
    default: 0  // 0 means no limit
  },
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  lastReminderSent: {
    type: Date
  },

  // Trust Score (1-5)
  trustScore: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },

  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],

  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for user + phone uniqueness
CustomerSchema.index({ user: 1, phone: 1 }, { unique: true, sparse: true });

// Index for search
CustomerSchema.index({ user: 1, name: 'text' });

// Virtual for transaction count
CustomerSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'customer',
  count: true
});

module.exports = mongoose.model('Customer', CustomerSchema);
