/**
 * Enhanced Product Model
 * With Expiry Tracking, Batch Management, and Stock Alerts
 */

const mongoose = require('mongoose');

// Batch Schema for tracking expiry per batch
const batchSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: true
  },
  
  quantity: {
    type: Number,
    required: true
  },
  
  manufacturingDate: {
    type: Date
  },
  
  expiryDate: {
    type: Date,
    required: true
  },
  
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  
  purchasePrice: {
    type: Number
  },
  
  supplier: {
    type: String
  },
  
  status: {
    type: String,
    enum: ['fresh', 'expiring_soon', 'expired', 'sold_out'],
    default: 'fresh'
  }
});

const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Basic Info
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  
  description: {
    type: String
  },
  
  // Identifiers
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  
  barcode: {
    type: String,
    index: true
  },
  
  // Category
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  
  brand: {
    type: String
  },
  
  // Pricing
  costPrice: {
    type: Number,
    required: true
  },
  
  sellingPrice: {
    type: Number,
    required: true
  },
  
  mrp: {
    type: Number
  },
  
  // Tax
  gstRate: {
    type: Number,
    enum: [0, 5, 12, 18, 28],
    default: 0
  },
  
  hsnCode: {
    type: String  // HSN/SAC Code for GST
  },
  
  // Stock
  currentStock: {
    type: Number,
    default: 0
  },
  
  unit: {
    type: String,
    enum: ['pcs', 'kg', 'g', 'l', 'ml', 'pack', 'box', 'dozen', 'meter'],
    default: 'pcs'
  },
  
  minStock: {
    type: Number,
    default: 10  // Alert when stock below this
  },
  
  maxStock: {
    type: Number
  },
  
  // Batch & Expiry Management
  batches: [batchSchema],
  
  // Expiry Settings
  hasExpiry: {
    type: Boolean,
    default: false
  },
  
  defaultShelfLife: {
    type: Number,  // Days
    default: 365
  },
  
  expiryAlertDays: {
    type: Number,
    default: 30  // Alert 30 days before expiry
  },
  
  // Nearest Expiry (auto-calculated)
  nearestExpiry: {
    type: Date
  },
  
  // Supplier Info
  defaultSupplier: {
    name: String,
    phone: String,
    email: String
  },
  
  // Product Image
  image: {
    url: String,
    publicId: String
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // For Storefront
  showInStore: {
    type: Boolean,
    default: true
  },
  
  // Stock Status (auto-calculated)
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  
  // Expiry Status (auto-calculated)  
  expiryStatus: {
    type: String,
    enum: ['fresh', 'expiring_soon', 'has_expired', 'no_expiry'],
    default: 'no_expiry'
  }
  
}, { timestamps: true });

// Calculate stock status before save
productSchema.pre('save', function(next) {
  // Stock Status
  if (this.currentStock <= 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.currentStock <= this.minStock) {
    this.stockStatus = 'low_stock';
  } else {
    this.stockStatus = 'in_stock';
  }
  
  // Calculate nearest expiry from batches
  if (this.hasExpiry && this.batches.length > 0) {
    const activeBatches = this.batches.filter(b => b.quantity > 0 && b.status !== 'expired');
    
    if (activeBatches.length > 0) {
      const nearestBatch = activeBatches.reduce((nearest, batch) => {
        return batch.expiryDate < nearest.expiryDate ? batch : nearest;
      });
      
      this.nearestExpiry = nearestBatch.expiryDate;
      
      const daysUntilExpiry = Math.ceil((this.nearestExpiry - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        this.expiryStatus = 'has_expired';
      } else if (daysUntilExpiry <= this.expiryAlertDays) {
        this.expiryStatus = 'expiring_soon';
      } else {
        this.expiryStatus = 'fresh';
      }
    }
  } else {
    this.expiryStatus = 'no_expiry';
  }
  
  next();
});

// Update batch statuses
productSchema.methods.updateBatchStatuses = function() {
  const today = new Date();
  
  this.batches.forEach(batch => {
    if (batch.quantity <= 0) {
      batch.status = 'sold_out';
    } else {
      const daysUntilExpiry = Math.ceil((batch.expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        batch.status = 'expired';
      } else if (daysUntilExpiry <= this.expiryAlertDays) {
        batch.status = 'expiring_soon';
      } else {
        batch.status = 'fresh';
      }
    }
  });
};

// Static method to get expiring products
productSchema.statics.getExpiringProducts = function(userId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    user: userId,
    hasExpiry: true,
    nearestExpiry: { $lte: futureDate },
    currentStock: { $gt: 0 }
  }).sort({ nearestExpiry: 1 });
};

// Static method to get low stock products
productSchema.statics.getLowStockProducts = function(userId) {
  return this.find({
    user: userId,
    stockStatus: { $in: ['low_stock', 'out_of_stock'] },
    isActive: true
  }).sort({ currentStock: 1 });
};

// Indexes
productSchema.index({ user: 1, name: 1 });
productSchema.index({ user: 1, barcode: 1 });
productSchema.index({ user: 1, stockStatus: 1 });
productSchema.index({ user: 1, expiryStatus: 1 });
productSchema.index({ nearestExpiry: 1 });

module.exports = mongoose.model('Product', productSchema);
