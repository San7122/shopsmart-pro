const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const { search, sort, hasBalance, page = 1, limit = 20 } = req.query;
    
    let query = { user: req.user.id, isActive: true };

    // Search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by balance
    if (hasBalance === 'true') {
      query.balance = { $gt: 0 };
    } else if (hasBalance === 'false') {
      query.balance = { $lte: 0 };
    }

    // Sorting
    let sortOption = { updatedAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'balance_high') sortOption = { balance: -1 };
    if (sort === 'balance_low') sortOption = { balance: 1 };
    if (sort === 'recent') sortOption = { updatedAt: -1 };

    const skip = (page - 1) * limit;

    const customers = await Customer.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(query);

    // Get summary stats
    const stats = await Customer.aggregate([
      { $match: { user: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalReceivable: { $sum: { $cond: [{ $gt: ['$balance', 0] }, '$balance', 0] } },
          totalPayable: { $sum: { $cond: [{ $lt: ['$balance', 0] }, { $abs: '$balance' }, 0] } },
          customersWithBalance: { $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      stats: stats[0] || { totalCustomers: 0, totalReceivable: 0, totalPayable: 0, customersWithBalance: 0 },
      data: customers
    });
  } catch (error) {
    console.error('Get Customers Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Get recent transactions
    const transactions = await Transaction.find({
      customer: customer._id,
      isDeleted: false
    })
      .sort({ transactionDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...customer.toObject(),
        recentTransactions: transactions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    req.body.user = req.user.id;

    const customer = await Customer.create(req.body);

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Customer with this phone number already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    let customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Don't allow updating balance directly
    delete req.body.balance;
    delete req.body.totalCredit;
    delete req.body.totalPaid;
    delete req.body.user;

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Delete customer (soft delete)
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Check if customer has balance
    if (customer.balance !== 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete customer with pending balance'
      });
    }

    customer.isActive = false;
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get customer transactions
// @route   GET /api/customers/:id/transactions
// @access  Private
exports.getCustomerTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    let query = { customer: customer._id, isDeleted: false };

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(query)
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
