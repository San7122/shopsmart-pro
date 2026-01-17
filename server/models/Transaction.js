const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  // References
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },

  // Transaction Type
  type: {
    type: String,
    enum: ['credit', 'payment'],  // credit = customer took goods on credit, payment = customer paid
    required: [true, 'Please specify transaction type']
  },

  // Amount
  amount: {
    type: Number,
    required: [true, 'Please provide transaction amount'],
    min: [0.01, 'Amount must be greater than 0']
  },

  // Balance after this transaction
  balanceAfter: {
    type: Number,
    required: true
  },

  // Payment Method (for payments)
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'],
    default: 'cash'
  },

  // Description
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // Bill/Invoice reference
  billNumber: {
    type: String,
    trim: true
  },

  // Attachments (bill images, etc.)
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],

  // Transaction Date (can be backdated)
  transactionDate: {
    type: Date,
    default: Date.now
  },

  // SMS/WhatsApp notification sent
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: {
    type: Date
  },

  // Metadata
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedReason: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
TransactionSchema.index({ user: 1, transactionDate: -1 });
TransactionSchema.index({ customer: 1, transactionDate: -1 });
TransactionSchema.index({ user: 1, type: 1, transactionDate: -1 });

// Pre-save middleware to update customer balance
TransactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Customer = mongoose.model('Customer');
    const customer = await Customer.findById(this.customer);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate new balance
    if (this.type === 'credit') {
      customer.balance += this.amount;
      customer.totalCredit += this.amount;
    } else if (this.type === 'payment') {
      customer.balance -= this.amount;
      customer.totalPaid += this.amount;
    }

    this.balanceAfter = customer.balance;
    await customer.save();
  }
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);
