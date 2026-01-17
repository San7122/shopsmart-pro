/**
 * Payment Schedule Model
 * Track payment due dates, installments, and collection schedule
 */

const mongoose = require('mongoose');

const paymentScheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  
  // Link to original transaction/invoice
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  
  // ==================
  // PAYMENT DETAILS
  // ==================
  totalAmount: {
    type: Number,
    required: true
  },
  
  paidAmount: {
    type: Number,
    default: 0
  },
  
  remainingAmount: {
    type: Number
  },
  
  // ==================
  // SCHEDULE TYPE
  // ==================
  scheduleType: {
    type: String,
    enum: ['one_time', 'installment', 'recurring'],
    default: 'one_time'
  },
  
  // For one-time payment
  dueDate: {
    type: Date,
    required: true
  },
  
  // ==================
  // INSTALLMENT DETAILS
  // ==================
  installments: [{
    installmentNumber: Number,
    amount: Number,
    dueDate: Date,
    paidDate: Date,
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending'
    },
    reminderSent: { type: Boolean, default: false },
    notes: String
  }],
  
  numberOfInstallments: {
    type: Number,
    default: 1
  },
  
  installmentFrequency: {
    type: String,
    enum: ['weekly', 'bi_weekly', 'monthly', 'custom'],
    default: 'monthly'
  },
  
  // ==================
  // STATUS
  // ==================
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  
  // ==================
  // REMINDER SETTINGS
  // ==================
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  
  reminderDays: {
    type: [Number],
    default: [3, 1, 0]  // Days before due date
  },
  
  overdueReminderFrequency: {
    type: String,
    enum: ['daily', 'every_3_days', 'weekly'],
    default: 'every_3_days'
  },
  
  lastReminderSent: {
    type: Date
  },
  
  remindersSent: {
    type: Number,
    default: 0
  },
  
  // ==================
  // LATE FEE
  // ==================
  lateFeeEnabled: {
    type: Boolean,
    default: false
  },
  
  lateFeeType: {
    type: String,
    enum: ['fixed', 'percentage'],
    default: 'fixed'
  },
  
  lateFeeValue: {
    type: Number,
    default: 0
  },
  
  lateFeeApplied: {
    type: Number,
    default: 0
  },
  
  // ==================
  // PROMISE TO PAY
  // ==================
  promisedDate: {
    type: Date
  },
  
  promisedAmount: {
    type: Number
  },
  
  promiseNotes: {
    type: String
  },
  
  // ==================
  // NOTES
  // ==================
  description: {
    type: String
  },
  
  notes: {
    type: String
  }
  
}, { timestamps: true });

// Calculate remaining amount before save
paymentScheduleSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount + this.lateFeeApplied;
  
  // Update status
  if (this.paidAmount >= this.totalAmount + this.lateFeeApplied) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else if (new Date() > this.dueDate) {
    this.status = 'overdue';
  } else {
    this.status = 'pending';
  }
  
  // Update installment statuses
  if (this.installments && this.installments.length > 0) {
    const today = new Date();
    this.installments.forEach(inst => {
      if (inst.paidAmount >= inst.amount) {
        inst.status = 'paid';
      } else if (inst.paidAmount > 0) {
        inst.status = 'partial';
      } else if (today > inst.dueDate) {
        inst.status = 'overdue';
      } else {
        inst.status = 'pending';
      }
    });
  }
  
  next();
});

// Static: Get upcoming dues
paymentScheduleSchema.statics.getUpcomingDues = function(userId, days = 7) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    user: userId,
    status: { $in: ['pending', 'partial'] },
    dueDate: { $gte: today, $lte: futureDate }
  })
  .populate('customer', 'name phone')
  .sort({ dueDate: 1 });
};

// Static: Get overdue payments
paymentScheduleSchema.statics.getOverduePayments = function(userId) {
  return this.find({
    user: userId,
    status: 'overdue'
  })
  .populate('customer', 'name phone currentBalance')
  .sort({ dueDate: 1 });
};

// Static: Get today's collections
paymentScheduleSchema.statics.getTodaysCollections = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    user: userId,
    dueDate: { $gte: today, $lt: tomorrow },
    status: { $in: ['pending', 'partial'] }
  })
  .populate('customer', 'name phone address')
  .sort({ dueDate: 1 });
};

// Method: Record payment
paymentScheduleSchema.methods.recordPayment = function(amount, installmentIndex = null) {
  if (installmentIndex !== null && this.installments[installmentIndex]) {
    this.installments[installmentIndex].paidAmount += amount;
    this.installments[installmentIndex].paidDate = new Date();
  }
  
  this.paidAmount += amount;
  return this.save();
};

// Method: Apply late fee
paymentScheduleSchema.methods.applyLateFee = function() {
  if (!this.lateFeeEnabled || this.status !== 'overdue') return;
  
  let fee = 0;
  if (this.lateFeeType === 'fixed') {
    fee = this.lateFeeValue;
  } else {
    fee = (this.totalAmount * this.lateFeeValue) / 100;
  }
  
  this.lateFeeApplied += fee;
  return this.save();
};

// Indexes
paymentScheduleSchema.index({ user: 1, customer: 1 });
paymentScheduleSchema.index({ user: 1, dueDate: 1 });
paymentScheduleSchema.index({ user: 1, status: 1 });
paymentScheduleSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('PaymentSchedule', paymentScheduleSchema);
