const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Please provide shop owner name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    unique: true
    // Phone validation is done in controller based on country
  },
  country: {
    type: String,
    enum: ['IN', 'NP'],
    default: 'IN',
    required: true
  },
  email: {
    type: String,
    sparse: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },

  // Shop Details
  shopName: {
    type: String,
    required: [true, 'Please provide shop name'],
    trim: true,
    maxlength: [200, 'Shop name cannot exceed 200 characters']
  },
  shopType: {
    type: String,
    enum: ['kirana', 'grocery', 'medical', 'electronics', 'clothing', 'hardware', 'stationery', 'other'],
    default: 'kirana'
  },
  address: {
    street: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }, // 6 digits for India, varies for Nepal
    country: { type: String, enum: ['IN', 'NP'], default: 'IN' }
  },
  // Tax ID (GST for India, PAN for Nepal)
  taxId: {
    type: String,
    trim: true
    // GST: 15 chars for India, PAN: 9 digits for Nepal
  },

  // Settings
  language: {
    type: String,
    enum: ['en', 'hi', 'ne', 'ta', 'te', 'mr', 'gu', 'bn', 'kn', 'ml', 'pa'],
    default: 'hi'  // 'ne' for Nepali
  },
  currency: {
    type: String,
    enum: ['INR', 'NPR'],
    default: 'INR'
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'  // 'Asia/Kathmandu' for Nepal
  },

  // Subscription (detailed info in Subscription model)
  plan: {
    type: String,
    enum: ['free', 'pro', 'business', 'pro_yearly', 'business_yearly'],
    default: 'free'
  },
  planExpiresAt: {
    type: Date
  },
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'trialing', 'active', 'past_due', 'cancelled', 'expired'],
    default: 'inactive'
  },
  trialEndsAt: {
    type: Date
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String
  }
}, {
  timestamps: true
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match entered password to hashed password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
