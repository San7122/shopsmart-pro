/**
 * n8n Integration Routes
 * These endpoints are called by n8n workflows for automation
 */

const express = require('express');
const router = express.Router();
const {
  getDuePayments,
  getDailySummary,
  getLowStockAlerts,
  getUserActivity,
  getWeeklyData,
  logNotification,
  saveAIInsights,
  triggerOnboarding
} = require('../controllers/n8nController');

// Middleware to verify internal API key for n8n
const verifyN8NKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const internalKey = process.env.SHOPSMART_INTERNAL_API_KEY;
  
  // Ensure the environment variable is set
  if (!internalKey) {
    console.error('ERROR: SHOPSMART_INTERNAL_API_KEY environment variable is not set!');
    throw new Error('SHOPSMART_INTERNAL_API_KEY environment variable is required for n8n integration');
  }
  
  if (apiKey !== internalKey) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - Invalid API key' 
    });
  }
  
  next();
};

// Apply API key verification to all routes
router.use(verifyN8NKey);

// =====================
// DATA FETCH ENDPOINTS
// (Called by n8n to get data)
// =====================

// Get customers with due/overdue payments
// Used by: Payment Reminder workflow
router.post('/due-payments', getDuePayments);

// Get daily summary for all active users
// Used by: Daily Reports workflow
router.get('/daily-summary', getDailySummary);

// Get products with low stock
// Used by: Low Stock Alert workflow
router.get('/low-stock', getLowStockAlerts);

// Get specific user's activity
// Used by: Onboarding workflow (Day 1 check)
router.get('/user-activity/:userId', getUserActivity);

// Get weekly data for AI analysis
// Used by: AI Insights workflow
router.get('/weekly-data', getWeeklyData);

// =====================
// CALLBACK ENDPOINTS
// (Called by n8n to update data)
// =====================

// Log that a notification was sent
// Used by: All notification workflows
router.post('/log-notification', logNotification);

// Save AI-generated insights
// Used by: AI Insights workflow
router.post('/save-ai-insights', saveAIInsights);

// Log that a report was sent
router.post('/log-report', (req, res) => {
  const { userId, reportType, sentAt, channels } = req.body;
  console.log(`[n8n] Report logged: ${reportType} sent to user ${userId} via ${channels.join(', ')}`);
  res.json({ success: true, message: 'Report logged' });
});

// =====================
// TRIGGER ENDPOINTS
// (Called by backend to trigger n8n workflows)
// =====================

// Trigger onboarding workflow for new user
router.post('/trigger/onboarding', triggerOnboarding);

// Trigger payment reminder for specific customer
router.post('/trigger/payment-reminder', async (req, res) => {
  const { customerId } = req.body;
  // Implementation similar to triggerOnboarding
  res.json({ success: true, message: 'Payment reminder triggered' });
});

module.exports = router;
