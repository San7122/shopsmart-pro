const Storefront = require('../models/Storefront');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');

// @desc    Get storefront settings
// @route   GET /api/storefront/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    let storefront = await Storefront.findOne({ user: req.user._id });
    
    if (!storefront) {
      // Create default storefront settings
      storefront = await Storefront.create({
        user: req.user._id,
        shopName: req.user.shopName,
        slug: req.user.phone,
        whatsappNumber: req.user.phone,
        welcomeMessage: `Welcome to ${req.user.shopName}!`
      });
    }
    
    res.json({
      success: true,
      data: storefront
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update storefront settings
// @route   PUT /api/storefront/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const allowedFields = [
      'enabled', 'slug', 'shopName', 'tagline', 'description', 
      'welcomeMessage', 'showPrices', 'showStock', 'showCategories',
      'whatsappNumber', 'phoneNumber', 'email', 'address',
      'businessHours', 'theme', 'socialLinks'
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    // Check slug uniqueness if being updated
    if (updates.slug) {
      const existing = await Storefront.findOne({ 
        slug: updates.slug, 
        user: { $ne: req.user._id } 
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'This store URL is already taken'
        });
      }
    }
    
    const storefront = await Storefront.findOneAndUpdate(
      { user: req.user._id },
      updates,
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: storefront
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get public store by slug
// @route   GET /api/store/:slug
// @access  Public
exports.getPublicStore = async (req, res) => {
  try {
    const storefront = await Storefront.findOne({ 
      slug: req.params.slug,
      enabled: true 
    }).populate('user', 'shopName shopType');
    
    if (!storefront) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }
    
    // Increment view count
    storefront.analytics.totalViews += 1;
    await storefront.save();
    
    // Get store products
    const products = await Product.find({ 
      user: storefront.user._id,
      isActive: true,
      ...(storefront.showStock ? {} : { stock: { $gt: 0 } })
    })
    .populate('category', 'name icon')
    .select(storefront.showPrices 
      ? 'name brand sellingPrice mrp stock unit images category'
      : 'name brand stock unit images category'
    )
    .sort({ category: 1, name: 1 });
    
    // Get categories
    const categories = storefront.showCategories 
      ? await Category.find({ user: storefront.user._id })
      : [];
    
    res.json({
      success: true,
      data: {
        store: {
          shopName: storefront.shopName,
          tagline: storefront.tagline,
          description: storefront.description,
          logo: storefront.logo,
          banner: storefront.banner,
          welcomeMessage: storefront.welcomeMessage,
          whatsappNumber: storefront.whatsappNumber,
          phoneNumber: storefront.phoneNumber,
          address: storefront.address,
          businessHours: storefront.businessHours,
          theme: storefront.theme,
          socialLinks: storefront.socialLinks,
          showPrices: storefront.showPrices,
          showStock: storefront.showStock
        },
        products,
        categories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Track WhatsApp click
// @route   POST /api/store/:slug/whatsapp-click
// @access  Public
exports.trackWhatsAppClick = async (req, res) => {
  try {
    await Storefront.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { 'analytics.whatsappClicks': 1 } }
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// @desc    Get store analytics
// @route   GET /api/storefront/analytics
// @access  Private
exports.getAnalytics = async (req, res) => {
  try {
    const storefront = await Storefront.findOne({ user: req.user._id });
    
    if (!storefront) {
      return res.json({
        success: true,
        data: {
          totalViews: 0,
          uniqueVisitors: 0,
          whatsappClicks: 0,
          productViews: 0
        }
      });
    }
    
    res.json({
      success: true,
      data: storefront.analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Check slug availability
// @route   GET /api/storefront/check-slug/:slug
// @access  Private
exports.checkSlug = async (req, res) => {
  try {
    const existing = await Storefront.findOne({ 
      slug: req.params.slug,
      user: { $ne: req.user._id }
    });
    
    res.json({
      success: true,
      available: !existing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
