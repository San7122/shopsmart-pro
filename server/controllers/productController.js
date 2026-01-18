const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      stockStatus,
      sort,
      page = 1,
      limit = 20
    } = req.query;

    let query = { user: req.user.id, isActive: true };

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Stock status filter
    if (stockStatus === 'out_of_stock') {
      query.stock = { $lte: 0 };
    } else if (stockStatus === 'low_stock') {
      query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockAlert'] }] };
    } else if (stockStatus === 'in_stock') {
      query.$expr = { $gt: ['$stock', '$lowStockAlert'] };
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'price_low') sortOption = { sellingPrice: 1 };
    if (sort === 'price_high') sortOption = { sellingPrice: -1 };
    if (sort === 'stock_low') sortOption = { stock: 1 };
    if (sort === 'stock_high') sortOption = { stock: -1 };
    if (sort === 'recent') sortOption = { createdAt: -1 };
    if (sort === 'bestselling') sortOption = { totalSold: -1 };

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate('category', 'name icon color')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    // Get inventory summary
    const summary = await Product.aggregate([
      { $match: { user: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$stock', '$costPrice'] } },
          totalSellingValue: { $sum: { $multiply: ['$stock', '$sellingPrice'] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockAlert'] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      summary: summary[0] || {
        totalProducts: 0,
        totalValue: 0,
        totalSellingValue: 0,
        outOfStock: 0,
        lowStock: 0
      },
      data: products
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('category', 'name icon color');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get product by barcode
// @route   GET /api/products/barcode/:barcode
// @access  Private
exports.getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({
      barcode: req.params.barcode,
      user: req.user.id,
      isActive: true
    }).populate('category', 'name icon color');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    req.body.user = req.user.id;

    // Validate category if provided
    if (req.body.category) {
      const categoryExists = await Category.findOne({
        _id: req.body.category,
        user: req.user.id
      });

      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          error: 'Category not found'
        });
      }
    }

    const product = await Product.create(req.body);
    await product.populate('category', 'name icon color');

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    delete req.body.user;
    delete req.body.totalSold;
    delete req.body.lastSoldAt;

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('category', 'name icon color');

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private
exports.updateStock = async (req, res) => {
  try {
    const { adjustment, type, reason } = req.body;

    let product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Calculate new stock
    let newStock = product.stock;
    if (type === 'add') {
      newStock += adjustment;
    } else if (type === 'remove') {
      newStock -= adjustment;
    } else if (type === 'set') {
      newStock = adjustment;
    }

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock cannot be negative'
      });
    }

    product.stock = newStock;
    await product.save();

    // Calculate previous stock before the adjustment
    let previousStock;
    if (type === 'set') {
      previousStock = null; // For set operations, there's no meaningful "previous" value
    } else {
      // For add/remove operations, calculate what stock was before adjustment
      previousStock = type === 'add' ? product.stock - adjustment : product.stock + adjustment;
    }
    
    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        name: product.name,
        previousStock: previousStock,
        currentStock: product.stock,
        adjustment,
        type
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/alerts/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      user: req.user.id,
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockAlert'] }
    })
      .populate('category', 'name icon color')
      .sort({ stock: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get expiring products
// @route   GET /api/products/alerts/expiring
// @access  Private
exports.getExpiringProducts = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const products = await Product.find({
      user: req.user.id,
      isActive: true,
      expiryDate: { $gte: today, $lte: thirtyDaysFromNow }
    })
      .populate('category', 'name icon color')
      .sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
