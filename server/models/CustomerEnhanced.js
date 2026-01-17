/**
 * Enhanced Customer Model
 * With GST/VAT, Credit Limits, Payment Terms, Documents
 */

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ==================
  // BASIC INFO
  // ==================
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  
  alternatePhone: {
    type: String
  },
  
  email: {
    type: String
  },
  
  // Customer Type
  customerType: {
    type: String,
    enum: ['individual', 'business', 'retailer', 'wholesaler'],
    default: 'individual'
  },
  
  // ==================
  // ADDRESS
  // ==================
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  
  // ==================
  // BUSINESS / TAX DETAILS
  // ==================
  businessName: {
    type: String  // If customer is a business
  },
  
  gstNumber: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // GST format: 22AAAAA0000A1Z5
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Invalid GST Number format'
    }
  },
  
  panNumber: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // PAN format: AAAAA0000A
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'Invalid PAN Number format'
    }
  },
  
  // Tax preference
  taxPreference: {
    type: String,
    enum: ['taxable', 'tax_exempt'],
    default: 'taxable'
  },
  
  // ==================
  // CREDIT SETTINGS
  // ==================
  creditLimit: {
    type: Number,
    default: 0  // 0 = no limit
  },
  
  currentBalance: {
    type: Number,
    default: 0
  },
  
  // Payment Terms
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'custom'],
    default: 'immediate'
  },
  
  customPaymentDays: {
    type: Number  // If paymentTerms is 'custom'
  },
  
  // Default due date calculation
  getPaymentDueDays: function() {
    const terms = {
      'immediate': 0,
      'net_7': 7,
      'net_15': 15,
      'net_30': 30,
      'net_45': 45,
      'net_60': 60
    };
    return this.paymentTerms === 'custom' 
      ? this.customPaymentDays 
      : (terms[this.paymentTerms] || 0);
  },
  
  // ==================
  // DOCUMENTS
  // ==================
  documents: [{
    documentType: {
      type: String,
      enum: ['aadhar', 'pan', 'gst_certificate', 'shop_license', 'photo', 'other']
    },
    documentNumber: String,
    documentUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  // ==================
  // REMINDER SETTINGS
  // ==================
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  
  preferredReminderChannel: {
    type: String,
    enum: ['whatsapp', 'sms', 'both'],
    default: 'whatsapp'
  },
  
  reminderFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'on_due_date', 'custom'],
    default: 'on_due_date'
  },
  
  lastReminderSent: {
    type: Date
  },
  
  // ==================
  // SPECIAL DATES
  // ==================
  dateOfBirth: {
    type: Date
  },
  
  anniversary: {
    type: Date
  },
  
  // ==================
  // LOYALTY / REWARDS
  // ==================
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  
  customerGroup: {
    type: String,
    enum: ['regular', 'silver', 'gold', 'platinum'],
    default: 'regular'
  },
  
  discountPercentage: {
    type: Number,
    default: 0  // Special discount for this customer
  },
  
  // ==================
  // STATISTICS (Auto-calculated)
  // ==================
  stats: {
    totalPurchases: { type: Number, default: 0 },
    totalPayments: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastPurchaseDate: Date,
    lastPaymentDate: Date,
    highestBalance: { type: Number, default: 0 },
    onTimePayments: { type: Number, default: 0 },
    latePayments: { type: Number, default: 0 }
  },
  
  // ==================
  // STATUS
  // ==================
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'defaulter'],
    default: 'active'
  },
  
  blockReason: {
    type: String
  },
  
  // ==================
  // NOTES
  // ==================
  notes: {
    type: String
  },
  
  tags: [{
    type: String
  }],
  
  // Profile Image
  profileImage: {
    url: String,
    publicId: String
  }
  
}, { timestamps: true });

// Virtual: Is over credit limit
customerSchema.virtual('isOverCreditLimit').get(function() {
  if (this.creditLimit === 0) return false;
  return this.currentBalance > this.creditLimit;
});

// Virtual: Available credit
customerSchema.virtual('availableCredit').get(function() {
  if (this.creditLimit === 0) return Infinity;
  return Math.max(0, this.creditLimit - this.currentBalance);
});

// Virtual: Payment score (0-100)
customerSchema.virtual('paymentScore').get(function() {
  const total = this.stats.onTimePayments + this.stats.latePayments;
  if (total === 0) return 100;
  return Math.round((this.stats.onTimePayments / total) * 100);
});

// Method: Update statistics
customerSchema.methods.updateStats = async function(type, amount) {
  if (type === 'credit') {
    this.stats.totalPurchases += amount;
    this.stats.lastPurchaseDate = new Date();
  } else if (type === 'payment') {
    this.stats.totalPayments += amount;
    this.stats.lastPaymentDate = new Date();
  }
  
  this.stats.totalTransactions += 1;
  
  if (this.stats.totalTransactions > 0) {
    this.stats.averageOrderValue = this.stats.totalPurchases / this.stats.totalTransactions;
  }
  
  if (this.currentBalance > this.stats.highestBalance) {
    this.stats.highestBalance = this.currentBalance;
  }
  
  await this.save();
};

// Indexes
customerSchema.index({ user: 1, phone: 1 }, { unique: true });
customerSchema.index({ user: 1, name: 'text', businessName: 'text' });
customerSchema.index({ user: 1, gstNumber: 1 });
customerSchema.index({ user: 1, status: 1 });
customerSchema.index({ user: 1, currentBalance: -1 });
customerSchema.index({ user: 1, customerGroup: 1 });

module.exports = mongoose.model('Customer', customerSchema);
