/**
 * Shop Documents Model
 * Track all business licenses, certificates and their expiry
 */

const mongoose = require('mongoose');

const shopDocumentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Document Type
  documentType: {
    type: String,
    enum: [
      'gst_certificate',      // GST Registration
      'shop_license',         // Shop & Establishment License
      'fssai_license',        // Food License
      'drug_license',         // Pharmacy License
      'trade_license',        // Trade License
      'fire_noc',             // Fire NOC
      'health_license',       // Health Trade License
      'pollution_noc',        // Pollution NOC
      'weighing_certificate', // Weights & Measures
      'pest_control',         // Pest Control Certificate
      'insurance',            // Shop Insurance
      'rent_agreement',       // Rent Agreement
      'pan_card',             // PAN Card
      'aadhar',               // Aadhar Card
      'bank_details',         // Bank Account Details
      'other'                 // Other Documents
    ],
    required: true
  },
  
  // Document Details
  documentName: {
    type: String,
    required: true
  },
  
  documentNumber: {
    type: String,
    required: true
  },
  
  // Issuing Authority
  issuedBy: {
    type: String
  },
  
  // Dates
  issueDate: {
    type: Date
  },
  
  expiryDate: {
    type: Date,
    required: true
  },
  
  // Reminder Settings
  reminderDays: {
    type: [Number],
    default: [90, 60, 30, 15, 7, 1] // Days before expiry to remind
  },
  
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  
  lastReminderSent: {
    type: Date
  },
  
  // Document File
  documentFile: {
    url: String,
    publicId: String,
    fileName: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'expiring_soon', 'renewed'],
    default: 'active'
  },
  
  // Renewal Info
  renewalCost: {
    type: Number
  },
  
  renewalNotes: {
    type: String
  },
  
  // Notes
  notes: {
    type: String
  }
  
}, { timestamps: true });

// Auto-update status based on expiry
shopDocumentSchema.pre('save', function(next) {
  const today = new Date();
  const daysUntilExpiry = Math.ceil((this.expiryDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    this.status = 'expired';
  } else if (daysUntilExpiry <= 30) {
    this.status = 'expiring_soon';
  } else {
    this.status = 'active';
  }
  
  next();
});

// Index for quick queries
shopDocumentSchema.index({ user: 1, documentType: 1 });
shopDocumentSchema.index({ expiryDate: 1 });
shopDocumentSchema.index({ status: 1 });

module.exports = mongoose.model('ShopDocument', shopDocumentSchema);
