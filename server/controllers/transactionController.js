const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const { 
      type, 
      customerId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    let query = { user: req.user.id, isDeleted: false };

    if (type) {
      query.type = type;
    }

    if (customerId) {
      query.customer = customerId;
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const transactions = await Transaction.find(query)
      .populate('customer', 'name phone')
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    // Get summary
    const summary = await Transaction.aggregate([
      { $match: { user: req.user._id, isDeleted: false } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summaryFormatted = {
      totalCredit: 0,
      totalPayments: 0,
      creditCount: 0,
      paymentCount: 0
    };

    summary.forEach(item => {
      if (item._id === 'credit') {
        summaryFormatted.totalCredit = item.total;
        summaryFormatted.creditCount = item.count;
      } else if (item._id === 'payment') {
        summaryFormatted.totalPayments = item.total;
        summaryFormatted.paymentCount = item.count;
      }
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      summary: summaryFormatted,
      data: transactions
    });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('customer', 'name phone balance');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create transaction (credit or payment)
// @route   POST /api/transactions
// @access  Private
exports.createTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, type, amount, description, paymentMethod, transactionDate, billNumber } = req.body;

    // Validate customer belongs to user
    const customer = await Customer.findOne({
      _id: customerId,
      user: req.user.id
    }).session(session);

    if (!customer) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Create transaction
    const transactionData = {
      user: req.user.id,
      customer: customerId,
      type,
      amount: parseFloat(amount),
      description,
      paymentMethod: type === 'payment' ? paymentMethod : undefined,
      transactionDate: transactionDate || new Date(),
      billNumber,
      balanceAfter: 0  // Will be set in pre-save hook
    };

    const transaction = await Transaction.create([transactionData], { session });

    // Fetch updated customer
    const updatedCustomer = await Customer.findById(customerId).session(session);

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: {
        transaction: transaction[0],
        customer: {
          id: updatedCustomer._id,
          name: updatedCustomer.name,
          balance: updatedCustomer.balance
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create Transaction Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  } finally {
    session.endSession();
  }
};

// @desc    Delete transaction (soft delete)
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
      isDeleted: false
    }).session(session);

    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Reverse the balance change
    const customer = await Customer.findById(transaction.customer).session(session);

    if (transaction.type === 'credit') {
      customer.balance -= transaction.amount;
      customer.totalCredit -= transaction.amount;
    } else if (transaction.type === 'payment') {
      customer.balance += transaction.amount;
      customer.totalPaid -= transaction.amount;
    }

    await customer.save({ session });

    // Soft delete the transaction
    transaction.isDeleted = true;
    transaction.deletedAt = new Date();
    transaction.deletedReason = reason || 'Deleted by user';
    await transaction.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {
        customer: {
          id: customer._id,
          balance: customer.balance
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete Transaction Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get today's transactions summary
// @route   GET /api/transactions/today
// @access  Private
exports.getTodaySummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          isDeleted: false,
          transactionDate: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      date: today,
      credit: { total: 0, count: 0 },
      payment: { total: 0, count: 0 }
    };

    summary.forEach(item => {
      if (item._id === 'credit') {
        result.credit = { total: item.total, count: item.count };
      } else if (item._id === 'payment') {
        result.payment = { total: item.total, count: item.count };
      }
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
