const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      user: req.user.id,
      isActive: true
    }).sort({ displayOrder: 1, name: 1 });

    // Get product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          user: req.user.id,
          category: cat._id,
          isActive: true
        });
        return {
          ...cat.toObject(),
          productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categoriesWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    req.body.user = req.user.id;

    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res) => {
  try {
    let category = await Category.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    delete req.body.user;

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({
      category: category._id,
      isActive: true
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category with ${productCount} products. Move or delete products first.`
      });
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create default categories for new user
// @route   POST /api/categories/defaults
// @access  Private
exports.createDefaults = async (req, res) => {
  try {
    const defaults = [
      { name: 'Groceries', icon: '🛒', color: '#22c55e' },
      { name: 'Dairy', icon: '🥛', color: '#3b82f6' },
      { name: 'Beverages', icon: '🥤', color: '#f59e0b' },
      { name: 'Snacks', icon: '🍪', color: '#ef4444' },
      { name: 'Personal Care', icon: '🧴', color: '#8b5cf6' },
      { name: 'Household', icon: '🏠', color: '#06b6d4' },
      { name: 'Fruits & Vegetables', icon: '🍎', color: '#84cc16' },
      { name: 'Frozen Foods', icon: '🧊', color: '#0ea5e9' },
      { name: 'Bakery', icon: '🍞', color: '#d97706' },
      { name: 'Other', icon: '📦', color: '#6b7280' }
    ];

    const existingCount = await Category.countDocuments({ user: req.user.id });

    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'User already has categories'
      });
    }

    const categories = await Category.insertMany(
      defaults.map((cat, index) => ({
        ...cat,
        user: req.user.id,
        displayOrder: index
      }))
    );

    res.status(201).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
