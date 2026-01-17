const mongoose = require('mongoose');

// Storefront Settings Schema
const storefrontSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  shopName: String,
  tagline: String,
  description: String,
  logo: String,
  banner: String,
  welcomeMessage: String,
  
  // Display settings
  showPrices: {
    type: Boolean,
    default: true
  },
  showStock: {
    type: Boolean,
    default: false
  },
  showCategories: {
    type: Boolean,
    default: true
  },
  
  // Contact settings
  whatsappNumber: String,
  phoneNumber: String,
  email: String,
  address: String,
  
  // Business hours
  businessHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  
  // Theme
  theme: {
    primaryColor: { type: String, default: '#7c3aed' },
    accentColor: { type: String, default: '#0ea5e9' }
  },
  
  // Social links
  socialLinks: {
    facebook: String,
    instagram: String,
    twitter: String
  },
  
  // Analytics
  analytics: {
    totalViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    whatsappClicks: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Generate slug from phone if not provided
storefrontSchema.pre('save', async function(next) {
  if (!this.slug && this.user) {
    const User = mongoose.model('User');
    const user = await User.findById(this.user);
    if (user) {
      this.slug = user.phone;
    }
  }
  next();
});

module.exports = mongoose.model('Storefront', storefrontSchema);
