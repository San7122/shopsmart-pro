const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,  // Denormalized for quick access
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity must be greater than 0']
  },
  unit: String,
  unitPrice: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  gstRate: {
    type: Number,
    default: 0
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  }
}, { _id: false });

const SaleSchema = new mongoose.Schema({
  // Owner reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Customer (optional - for walk-in customers)
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: String,  // For quick display

  // Bill Info
  billNumber: {
    type: String,
    required: true
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },

  // Items
  items: [SaleItemSchema],

  // Totals
  subtotal: {
    type: Number,
    required: true
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalGst: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true
  },

  // Payment
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid'],
    default: 'paid'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'bank_transfer', 'credit', 'mixed'],
    default: 'cash'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  amountDue: {
    type: Number,
    default: 0
  },

  // For credit sales - link to transaction
  creditTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },

  // Notes
  notes: {
    type: String,
    trim: true
  },

  // Status
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'returned'],
    default: 'completed'
  },
  cancelledAt: Date,
  cancelReason: String
}, {
  timestamps: true
});

// Indexes
SaleSchema.index({ user: 1, invoiceDate: -1 });
SaleSchema.index({ user: 1, billNumber: 1 }, { unique: true });
SaleSchema.index({ user: 1, customer: 1, invoiceDate: -1 });
SaleSchema.index({ user: 1, paymentStatus: 1 });

// Pre-save: Generate bill number
SaleSchema.pre('save', async function(next) {
  if (this.isNew && !this.billNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Sale').countDocuments({
      user: this.user,
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    this.billNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Post-save: Update product stock
SaleSchema.post('save', async function(doc) {
  if (doc.status === 'completed') {
    const Product = mongoose.model('Product');
    for (const item of doc.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 
          stock: -item.quantity,
          totalSold: item.quantity
        },
        $set: { lastSoldAt: new Date() }
      });
    }
  }
});

module.exports = mongoose.model('Sale', SaleSchema);
