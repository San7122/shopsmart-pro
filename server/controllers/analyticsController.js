const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const mongoose = require('mongoose');

// @desc    Get dashboard overview
// @route   GET /api/analytics/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's transactions summary
    const todayTransactions = await Transaction.aggregate([
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

    // Total receivables (customer balances)
    const receivables = await Customer.aggregate([
      { $match: { user: req.user._id, isActive: true, balance: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$balance' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Inventory stats
    const inventoryStats = await Product.aggregate([
      { $match: { user: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$stock', '$costPrice'] } },
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

    // Monthly transactions trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyTrend = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          isDeleted: false,
          transactionDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Customer count
    const customerCount = await Customer.countDocuments({
      user: req.user.id,
      isActive: true
    });

    // Format response
    const todaySummary = {
      credit: { total: 0, count: 0 },
      payment: { total: 0, count: 0 }
    };

    todayTransactions.forEach(item => {
      if (item._id === 'credit') {
        todaySummary.credit = { total: item.total, count: item.count };
      } else if (item._id === 'payment') {
        todaySummary.payment = { total: item.total, count: item.count };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        today: todaySummary,
        receivables: receivables[0] || { total: 0, count: 0 },
        inventory: inventoryStats[0] || {
          totalProducts: 0,
          totalValue: 0,
          outOfStock: 0,
          lowStock: 0
        },
        customerCount,
        monthlyTrend: formatTrendData(monthlyTrend)
      }
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get transaction analytics
// @route   GET /api/analytics/transactions
// @access  Private
exports.getTransactionAnalytics = async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    let startDate = new Date();
    if (period === '7days') startDate.setDate(startDate.getDate() - 7);
    else if (period === '30days') startDate.setDate(startDate.getDate() - 30);
    else if (period === '90days') startDate.setDate(startDate.getDate() - 90);
    else if (period === '1year') startDate.setFullYear(startDate.getFullYear() - 1);

    // Daily breakdown
    const dailyData = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          isDeleted: false,
          transactionDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Payment method breakdown
    const paymentMethods = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          isDeleted: false,
          type: 'payment',
          transactionDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top customers by credit
    const topCreditCustomers = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          isDeleted: false,
          type: 'credit',
          transactionDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalCredit: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalCredit: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      {
        $project: {
          customerId: '$_id',
          name: '$customer.name',
          phone: '$customer.phone',
          totalCredit: 1,
          count: 1,
          currentBalance: '$customer.balance'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        dailyBreakdown: formatTrendData(dailyData),
        paymentMethods,
        topCreditCustomers
      }
    });
  } catch (error) {
    console.error('Transaction Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get inventory analytics
// @route   GET /api/analytics/inventory
// @access  Private
exports.getInventoryAnalytics = async (req, res) => {
  try {
    // Category-wise breakdown
    const categoryBreakdown = await Product.aggregate([
      { $match: { user: req.user._id, isActive: true } },
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$stock', '$costPrice'] } }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          categoryId: '$_id',
          categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
          categoryIcon: { $ifNull: ['$category.icon', '📦'] },
          productCount: 1,
          totalStock: 1,
          totalValue: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Top selling products
    const topSelling = await Product.find({
      user: req.user.id,
      isActive: true,
      totalSold: { $gt: 0 }
    })
      .sort({ totalSold: -1 })
      .limit(10)
      .select('name brand totalSold stock sellingPrice');

    // Low stock alerts
    const lowStockCount = await Product.countDocuments({
      user: req.user.id,
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockAlert'] }
    });

    // Expiring soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringCount = await Product.countDocuments({
      user: req.user.id,
      isActive: true,
      expiryDate: { $gte: new Date(), $lte: thirtyDaysFromNow }
    });

    res.status(200).json({
      success: true,
      data: {
        categoryBreakdown,
        topSelling,
        alerts: {
          lowStock: lowStockCount,
          expiringSoon: expiringCount
        }
      }
    });
  } catch (error) {
    console.error('Inventory Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get customer analytics
// @route   GET /api/analytics/customers
// @access  Private
exports.getCustomerAnalytics = async (req, res) => {
  try {
    // Customer summary
    const summary = await Customer.aggregate([
      { $match: { user: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalReceivable: { $sum: { $cond: [{ $gt: ['$balance', 0] }, '$balance', 0] } },
          customersWithBalance: { $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] } },
          avgBalance: { $avg: { $cond: [{ $gt: ['$balance', 0] }, '$balance', null] } }
        }
      }
    ]);

    // Top debtors
    const topDebtors = await Customer.find({
      user: req.user.id,
      isActive: true,
      balance: { $gt: 0 }
    })
      .sort({ balance: -1 })
      .limit(10)
      .select('name phone balance totalCredit totalPaid trustScore');

    // Trust score distribution
    const trustDistribution = await Customer.aggregate([
      { $match: { user: req.user._id, isActive: true } },
      {
        $group: {
          _id: '$trustScore',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // New customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newCustomersThisMonth = await Customer.countDocuments({
      user: req.user.id,
      isActive: true,
      createdAt: { $gte: startOfMonth }
    });

    res.status(200).json({
      success: true,
      data: {
        summary: summary[0] || {
          totalCustomers: 0,
          totalReceivable: 0,
          customersWithBalance: 0,
          avgBalance: 0
        },
        topDebtors,
        trustDistribution,
        newCustomersThisMonth
      }
    });
  } catch (error) {
    console.error('Customer Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Helper function to format trend data
function formatTrendData(data) {
  const formatted = {};
  
  data.forEach(item => {
    const date = item._id.date;
    if (!formatted[date]) {
      formatted[date] = { date, credit: 0, payment: 0 };
    }
    if (item._id.type === 'credit') {
      formatted[date].credit = item.total;
    } else if (item._id.type === 'payment') {
      formatted[date].payment = item.total;
    }
  });

  return Object.values(formatted).sort((a, b) => new Date(a.date) - new Date(b.date));
}
