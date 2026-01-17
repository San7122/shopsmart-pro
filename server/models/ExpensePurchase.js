/**
 * Expense & Purchase Model
 * Track shop expenses, purchases, and vendor payments
 */

const mongoose = require('mongoose');

// ==================
// EXPENSE SCHEMA
// ==================
const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Expense Category
  category: {
    type: String,
    enum: [
      'rent',
      'electricity',
      'water',
      'salary',
      'transport',
      'maintenance',
      'marketing',
      'packaging',
      'insurance',
      'taxes',
      'bank_charges',
      'telephone',
      'internet',
      'office_supplies',
      'miscellaneous'
    ],
    required: true
  },
  
  amount: {
    type: Number,
    required: true
  },
  
  description: {
    type: String
  },
  
  date: {
    type: Date,
    default: Date.now
  },
  
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank_transfer', 'card', 'cheque'],
    default: 'cash'
  },
  
  // Receipt/Bill
  receipt: {
    url: String,
    publicId: String
  },
  
  // Recurring expense
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  },
  
  nextDueDate: {
    type: Date
  },
  
  notes: String
  
}, { timestamps: true });

// ==================
// PURCHASE / STOCK ENTRY SCHEMA
// ==================
const purchaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Purchase Number
  purchaseNumber: {
    type: String,
    unique: true
  },
  
  // Supplier/Vendor Details
  supplier: {
    name: { type: String, required: true },
    phone: String,
    email: String,
    gstNumber: String,
    address: String
  },
  
  // Purchase Date
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  
  // Invoice Details
  supplierInvoiceNumber: String,
  supplierInvoiceDate: Date,
  
  // Items Purchased
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    quantity: Number,
    unit: String,
    costPrice: Number,
    totalCost: Number,
    batchNumber: String,
    manufacturingDate: Date,
    expiryDate: Date,
    mrp: Number,
    sellingPrice: Number
  }],
  
  // Totals
  subtotal: {
    type: Number,
    required: true
  },
  
  discount: {
    type: Number,
    default: 0
  },
  
  taxAmount: {
    type: Number,
    default: 0
  },
  
  shippingCost: {
    type: Number,
    default: 0
  },
  
  grandTotal: {
    type: Number,
    required: true
  },
  
  // Payment Status
  paidAmount: {
    type: Number,
    default: 0
  },
  
  dueAmount: {
    type: Number
  },
  
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  
  paymentDueDate: {
    type: Date
  },
  
  // Payment History
  payments: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'cheque']
    },
    reference: String,
    notes: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'received', 'cancelled'],
    default: 'confirmed'
  },
  
  receivedDate: Date,
  
  // Documents
  documents: [{
    type: { type: String },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  notes: String
  
}, { timestamps: true });

// Auto-generate purchase number
purchaseSchema.pre('save', async function(next) {
  if (!this.purchaseNumber) {
    const count = await this.constructor.countDocuments({ user: this.user });
    this.purchaseNumber = `PO-${Date.now()}-${count + 1}`;
  }
  
  // Calculate due amount
  this.dueAmount = this.grandTotal - this.paidAmount;
  
  // Update payment status
  if (this.paidAmount >= this.grandTotal) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'unpaid';
  }
  
  next();
});

// ==================
// SUPPLIER/VENDOR SCHEMA
// ==================
const supplierSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  name: {
    type: String,
    required: true
  },
  
  businessName: String,
  
  phone: {
    type: String,
    required: true
  },
  
  alternatePhone: String,
  
  email: String,
  
  gstNumber: String,
  
  panNumber: String,
  
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  
  // Bank Details for payment
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    upiId: String
  },
  
  // Categories they supply
  categories: [String],
  
  // Payment Terms
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60'],
    default: 'net_30'
  },
  
  // Statistics
  stats: {
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    lastPurchaseDate: Date
  },
  
  // Rating
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  notes: String
  
}, { timestamps: true });

// Indexes
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });
purchaseSchema.index({ user: 1, purchaseDate: -1 });
purchaseSchema.index({ user: 1, paymentStatus: 1 });
supplierSchema.index({ user: 1, name: 1 });

const Expense = mongoose.model('Expense', expenseSchema);
const Purchase = mongoose.model('Purchase', purchaseSchema);
const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = { Expense, Purchase, Supplier };
