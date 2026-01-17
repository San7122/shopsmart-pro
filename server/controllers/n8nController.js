/**
 * n8n Webhook Integration Controller
 * Handles webhooks from n8n workflows and provides data endpoints for n8n
 */

const User = require('../models/User');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

// @desc    Get customers with due payments (for n8n payment reminders)
// @route   POST /api/n8n/due-payments
// @access  Internal (n8n only)
exports.getDuePayments = async (req, res) => {
  try {
    const { daysOverdue = 0, minAmount = 100 } = req.body;
    
    // Get all customers with positive balance
    const customersWithBalance = await Customer.aggregate([
      {
        $match: {
          balance: { $gte: Number(minAmount) }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'shopOwner'
        }
      },
      { $unwind: '$shopOwner' },
      {
        $lookup: {
          from: 'transactions',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$customer', '$$customerId'] },
                type: 'credit'
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'lastCredit'
        }
      },
      {
        $addFields: {
          lastCreditDate: { $arrayElemAt: ['$lastCredit.createdAt', 0] },
          daysSinceCredit: {
            $divide: [
              { $subtract: [new Date(), { $arrayElemAt: ['$lastCredit.createdAt', 0] }] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $match: daysOverdue > 0 ? { daysSinceCredit: { $gte: daysOverdue } } : {}
      },
      {
        $project: {
          customerId: '$_id',
          name: 1,
          phone: 1,
          balance: 1,
          daysSinceCredit: { $round: ['$daysSinceCredit', 0] },
          userId: '$shopOwner._id',
          shopName: '$shopOwner.shopName',
          shopOwnerPhone: '$shopOwner.phone'
        }
      },
      { $sort: { balance: -1 } }
    ]);
    
    res.json({
      success: true,
      count: customersWithBalance.length,
      customers: customersWithBalance
    });
  } catch (error) {
    console.error('n8n due-payments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get daily summary for all active users (for n8n reports)
// @route   GET /api/n8n/daily-summary
// @access  Internal (n8n only)
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    const userSummaries = await User.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                createdAt: { $gte: startOfDay, $lte: endOfDay }
              }
            }
          ],
          as: 'todayTransactions'
        }
      },
      {
        $lookup: {
          from: 'customers',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$userId'] }, balance: { $gt: 0 } } }
          ],
          as: 'customersWithBalance'
        }
      },
      {
        $project: {
          userId: '$_id',
          name: 1,
          phone: 1,
          email: 1,
          shopName: 1,
          todayCredit: {
            $sum: {
              $map: {
                input: { $filter: { input: '$todayTransactions', cond: { $eq: ['$$this.type', 'credit'] } } },
                in: '$$this.amount'
              }
            }
          },
          todayPayment: {
            $sum: {
              $map: {
                input: { $filter: { input: '$todayTransactions', cond: { $eq: ['$$this.type', 'payment'] } } },
                in: '$$this.amount'
              }
            }
          },
          todayTransactions: { $size: '$todayTransactions' },
          totalReceivables: { $sum: '$customersWithBalance.balance' },
          customersWithBalance: { $size: '$customersWithBalance' }
        }
      },
      { $match: { todayTransactions: { $gt: 0 } } }
    ]);
    
    res.json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      count: userSummaries.length,
      users: userSummaries
    });
  } catch (error) {
    console.error('n8n daily-summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get low stock alerts (for n8n inventory alerts)
// @route   GET /api/n8n/low-stock
// @access  Internal (n8n only)
exports.getLowStockAlerts = async (req, res) => {
  try {
    const lowStockProducts = await Product.aggregate([
      {
        $match: {
          $expr: { $lte: ['$stock', '$minStock'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: '$owner' },
      {
        $project: {
          productId: '$_id',
          productName: '$name',
          currentStock: '$stock',
          minStock: 1,
          unit: 1,
          userId: '$owner._id',
          userName: '$owner.name',
          userPhone: '$owner.phone',
          shopName: '$owner.shopName'
        }
      },
      { $sort: { currentStock: 1 } }
    ]);
    
    res.json({
      success: true,
      count: lowStockProducts.length,
      alerts: lowStockProducts
    });
  } catch (error) {
    console.error('n8n low-stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get user activity for onboarding check (for n8n onboarding)
// @route   GET /api/n8n/user-activity/:userId
// @access  Internal (n8n only)
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const customersCount = await Customer.countDocuments({ user: userId });
    const transactionsCount = await Transaction.countDocuments({ user: userId });
    const productsCount = await Product.countDocuments({ user: userId });
    
    const lastLogin = user.lastLogin || user.createdAt;
    const daysSinceRegistration = Math.floor(
      (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
    );
    
    res.json({
      success: true,
      userId: user._id,
      userName: user.name,
      userPhone: user.phone,
      shopName: user.shopName,
      customersAdded: customersCount,
      transactionsCreated: transactionsCount,
      productsAdded: productsCount,
      daysSinceRegistration,
      lastLogin,
      isActive: customersCount > 0 || transactionsCount > 0
    });
  } catch (error) {
    console.error('n8n user-activity error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get weekly data for AI analysis (for n8n AI insights)
// @route   GET /api/n8n/weekly-data
// @access  Internal (n8n only)
exports.getWeeklyData = async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const userWeeklyData = await User.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                createdAt: { $gte: weekAgo }
              }
            }
          ],
          as: 'thisWeekTxns'
        }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$user', '$$userId'] },
                createdAt: { $gte: twoWeeksAgo, $lt: weekAgo }
              }
            }
          ],
          as: 'lastWeekTxns'
        }
      },
      {
        $lookup: {
          from: 'customers',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$userId'] } } }
          ],
          as: 'customers'
        }
      },
      {
        $project: {
          userId: '$_id',
          name: 1,
          phone: 1,
          shopName: 1,
          shopType: 1,
          
          // This week stats
          weeklyCredit: {
            $sum: {
              $map: {
                input: { $filter: { input: '$thisWeekTxns', cond: { $eq: ['$$this.type', 'credit'] } } },
                in: '$$this.amount'
              }
            }
          },
          weeklyPayments: {
            $sum: {
              $map: {
                input: { $filter: { input: '$thisWeekTxns', cond: { $eq: ['$$this.type', 'payment'] } } },
                in: '$$this.amount'
              }
            }
          },
          weeklyTransactions: { $size: '$thisWeekTxns' },
          
          // Last week stats for comparison
          lastWeekCredit: {
            $sum: {
              $map: {
                input: { $filter: { input: '$lastWeekTxns', cond: { $eq: ['$$this.type', 'credit'] } } },
                in: '$$this.amount'
              }
            }
          },
          lastWeekPayments: {
            $sum: {
              $map: {
                input: { $filter: { input: '$lastWeekTxns', cond: { $eq: ['$$this.type', 'payment'] } } },
                in: '$$this.amount'
              }
            }
          },
          
          // Customer stats
          totalCustomers: { $size: '$customers' },
          totalReceivables: { $sum: '$customers.balance' },
          overdueCustomers: {
            $size: {
              $filter: {
                input: '$customers',
                cond: { $gt: ['$$this.balance', 5000] }
              }
            }
          },
          overdueAmount: {
            $sum: {
              $map: {
                input: { $filter: { input: '$customers', cond: { $gt: ['$$this.balance', 5000] } } },
                in: '$$this.balance'
              }
            }
          },
          
          // Top customers owing
          topCustomersOwing: {
            $slice: [
              {
                $sortArray: {
                  input: {
                    $map: {
                      input: { $filter: { input: '$customers', cond: { $gt: ['$$this.balance', 0] } } },
                      in: { name: '$$this.name', balance: '$$this.balance' }
                    }
                  },
                  sortBy: { balance: -1 }
                }
              },
              5
            ]
          }
        }
      },
      {
        $addFields: {
          creditGrowthPct: {
            $cond: [
              { $eq: ['$lastWeekCredit', 0] },
              0,
              { $multiply: [{ $divide: [{ $subtract: ['$weeklyCredit', '$lastWeekCredit'] }, '$lastWeekCredit'] }, 100] }
            ]
          },
          paymentGrowthPct: {
            $cond: [
              { $eq: ['$lastWeekPayments', 0] },
              0,
              { $multiply: [{ $divide: [{ $subtract: ['$weeklyPayments', '$lastWeekPayments'] }, '$lastWeekPayments'] }, 100] }
            ]
          }
        }
      },
      { $match: { weeklyTransactions: { $gt: 0 } } }
    ]);
    
    res.json({
      success: true,
      weekStart: weekAgo.toISOString().split('T')[0],
      weekEnd: now.toISOString().split('T')[0],
      count: userWeeklyData.length,
      users: userWeeklyData
    });
  } catch (error) {
    console.error('n8n weekly-data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Log notification sent (for tracking from n8n)
// @route   POST /api/n8n/log-notification
// @access  Internal (n8n only)
exports.logNotification = async (req, res) => {
  try {
    const { customerId, userId, type, channel, status, sentAt } = req.body;
    
    // You could save this to a notifications collection
    // For now, just log and return success
    console.log(`[n8n] Notification logged: ${type} via ${channel} to customer ${customerId}`);
    
    res.json({
      success: true,
      message: 'Notification logged',
      data: { customerId, userId, type, channel, status, sentAt }
    });
  } catch (error) {
    console.error('n8n log-notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Save AI insights (from n8n AI workflow)
// @route   POST /api/n8n/save-ai-insights
// @access  Internal (n8n only)
exports.saveAIInsights = async (req, res) => {
  try {
    const { userId, insights, generatedAt, type } = req.body;
    
    // Update user with AI insights
    await User.findByIdAndUpdate(userId, {
      $push: {
        aiInsights: {
          content: insights,
          generatedAt: new Date(generatedAt),
          type
        }
      }
    });
    
    res.json({
      success: true,
      message: 'AI insights saved',
      userId
    });
  } catch (error) {
    console.error('n8n save-ai-insights error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Trigger onboarding workflow via n8n webhook
// @route   POST /api/n8n/trigger/onboarding
// @access  Internal
exports.triggerOnboarding = async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Call n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook';
    
    const response = await fetch(`${n8nWebhookUrl}/new-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        shopName: user.shopName
      })
    });
    
    const result = await response.json();
    
    res.json({
      success: true,
      message: 'Onboarding workflow triggered',
      n8nResponse: result
    });
  } catch (error) {
    console.error('n8n trigger-onboarding error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
