/**
 * Comprehensive Input Validation Middleware
 * Provides consistent validation for all API endpoints
 */

const { body, param, query, validationResult } = require('express-validator');

// Custom validation helper functions
const customValidators = {
  // Phone number validation for India
  isValidIndianPhone: (phone) => {
    return /^[6-9]\d{9}$/.test(phone);
  },

  // Phone number validation for Nepal
  isValidNepaliPhone: (phone) => {
    return /^[9][6-8]\d{8}$/.test(phone);
  },

  // Email validation
  isValidEmail: (email) => {
    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
  },

  // GST number validation (India)
  isValidGST: (gst) => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
  },

  // PAN number validation (India)
  isValidPAN: (pan) => {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
  },

  // Price validation (positive decimal)
  isValidPrice: (price) => {
    return !isNaN(price) && parseFloat(price) >= 0;
  },

  // Quantity validation (positive integer)
  isValidQuantity: (qty) => {
    const num = parseInt(qty);
    return !isNaN(num) && num >= 0;
  }
};

// Validation middleware generator
const validate = (schema) => {
  return [...schema, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg,
          value: err.value
        }))
      });
    }
    next();
  }];
};

// Common validation schemas
const validationSchemas = {
  // User registration validation
  userRegistration: [
    body('name')
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
    
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .custom((value, { req }) => {
        if (req.body.country === 'NP') {
          return customValidators.isValidNepaliPhone(value);
        }
        return customValidators.isValidIndianPhone(value);
      }).withMessage('Invalid phone number format'),
    
    body('shopName')
      .notEmpty().withMessage('Shop name is required')
      .isLength({ min: 2, max: 200 }).withMessage('Shop name must be between 2 and 200 characters'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('email')
      .optional()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('country')
      .optional()
      .isIn(['IN', 'NP']).withMessage('Country must be IN (India) or NP (Nepal)')
  ],

  // Product validation
  product: [
    body('name')
      .notEmpty().withMessage('Product name is required')
      .isLength({ min: 1, max: 200 }).withMessage('Product name must be between 1 and 200 characters'),
    
    body('sellingPrice')
      .notEmpty().withMessage('Selling price is required')
      .isFloat({ min: 0 }).withMessage('Selling price must be a positive number')
      .custom(customValidators.isValidPrice).withMessage('Invalid price format'),
    
    body('costPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Cost price must be a positive number'),
    
    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
      .custom(customValidators.isValidQuantity).withMessage('Invalid stock quantity'),
    
    body('lowStockAlert')
      .optional()
      .isInt({ min: 0 }).withMessage('Low stock alert must be a non-negative integer'),
    
    body('sku')
      .optional()
      .isLength({ max: 50 }).withMessage('SKU cannot exceed 50 characters'),
    
    body('brand')
      .optional()
      .isLength({ max: 100 }).withMessage('Brand name cannot exceed 100 characters'),
    
    body('description')
      .optional()
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
  ],

  // Customer validation
  customer: [
    body('name')
      .notEmpty().withMessage('Customer name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Customer name must be between 1 and 100 characters'),
    
    body('phone')
      .optional()
      .custom(customValidators.isValidIndianPhone).withMessage('Invalid Indian phone number'),
    
    body('email')
      .optional()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    
    body('balance')
      .optional()
      .isFloat().withMessage('Balance must be a valid number'),
    
    body('creditLimit')
      .optional()
      .isFloat({ min: 0 }).withMessage('Credit limit must be a non-negative number')
  ],

  // Transaction validation
  transaction: [
    body('type')
      .notEmpty().withMessage('Transaction type is required')
      .isIn(['credit', 'payment']).withMessage('Transaction type must be credit or payment'),
    
    body('amount')
      .notEmpty().withMessage('Amount is required')
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    
    body('description')
      .optional()
      .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'])
      .withMessage('Invalid payment method')
  ],

  // Stock update validation
  stockUpdate: [
    body('adjustment')
      .notEmpty().withMessage('Adjustment value is required')
      .isInt({ gt: 0 }).withMessage('Adjustment must be a positive integer'),
    
    body('type')
      .notEmpty().withMessage('Adjustment type is required')
      .isIn(['add', 'remove', 'set']).withMessage('Type must be add, remove, or set'),
    
    body('reason')
      .optional()
      .isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters')
  ],

  // ID parameter validation
  objectId: [
    param('id')
      .notEmpty().withMessage('ID parameter is required')
      .isMongoId().withMessage('Invalid ID format')
  ],

  // Search and pagination validation
  searchParams: [
    query('search')
      .optional()
      .isLength({ max: 100 }).withMessage('Search term too long'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
    
    query('sort')
      .optional()
      .isIn(['name', 'price_low', 'price_high', 'stock_low', 'stock_high', 'recent', 'bestselling'])
      .withMessage('Invalid sort parameter')
  ]
};

// Export validation utilities
module.exports = {
  validate,
  validationSchemas,
  customValidators
};