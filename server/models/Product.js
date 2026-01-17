const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // Owner reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Category reference
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },

  // SKU & Barcode
  sku: {
    type: String,
    trim: true,
    maxlength: [50, 'SKU cannot exceed 50 characters']
  },
  barcode: {
    type: String,
    trim: true
  },

  // Pricing
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative'],
    default: 0
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Please provide selling price'],
    min: [0, 'Selling price cannot be negative']
  },
  mrp: {
    type: Number,
    min: [0, 'MRP cannot be negative']
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  },

  // Tax
  gstRate: {
    type: Number,
    enum: [0, 5, 12, 18, 28],
    default: 0
  },
  hsnCode: {
    type: String,
    trim: true
  },

  // Inventory
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  unit: {
    type: String,
    enum: ['pcs', 'kg', 'g', 'l', 'ml', 'dozen', 'pack', 'box', 'pair', 'meter', 'sqft', 'other'],
    default: 'pcs'
  },
  lowStockAlert: {
    type: Number,
    default: 10  // Alert when stock falls below this
  },

  // Expiry Management
  expiryDate: {
    type: Date
  },
  expiryAlertDays: {
    type: Number,
    default: 30  // Alert X days before expiry
  },

  // Images
  images: [{
    url: String,
    isPrimary: { type: Boolean, default: false }
  }],

  // Variants (for products with size/color options)
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: [{
    name: String,  // e.g., "500g", "Red", "Large"
    sku: String,
    barcode: String,
    costPrice: Number,
    sellingPrice: Number,
    stock: Number
  }],

  // Tags for search
  tags: [{
    type: String,
    trim: true
  }],

  // Supplier Info
  supplier: {
    name: String,
    phone: String,
    email: String
  },

  // Sales Stats (denormalized for quick access)
  totalSold: {
    type: Number,
    default: 0
  },
  lastSoldAt: {
    type: Date
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
ProductSchema.index({ user: 1, name: 'text', brand: 'text', tags: 'text' });
ProductSchema.index({ user: 1, barcode: 1 });
ProductSchema.index({ user: 1, sku: 1 });
ProductSchema.index({ user: 1, stock: 1 });  // For low stock queries
ProductSchema.index({ user: 1, expiryDate: 1 });  // For expiry alerts

// Virtual for profit margin
ProductSchema.virtual('profitMargin').get(function() {
  if (this.costPrice && this.sellingPrice) {
    return ((this.sellingPrice - this.costPrice) / this.sellingPrice * 100).toFixed(2);
  }
  return 0;
});

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function() {
  if (this.stock <= 0) return 'out_of_stock';
  if (this.stock <= this.lowStockAlert) return 'low_stock';
  return 'in_stock';
});

// Check expiry status
ProductSchema.virtual('expiryStatus').get(function() {
  if (!this.expiryDate) return 'no_expiry';
  const daysUntilExpiry = Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= this.expiryAlertDays) return 'expiring_soon';
  return 'ok';
});

module.exports = mongoose.model('Product', ProductSchema);
