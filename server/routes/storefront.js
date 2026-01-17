// Storefront Routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSettings,
  updateSettings,
  getPublicStore,
  trackWhatsAppClick,
  getAnalytics,
  checkSlug
} = require('../controllers/storefrontController');

// Private routes (require auth)
router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.get('/analytics', protect, getAnalytics);
router.get('/check-slug/:slug', protect, checkSlug);

// Public routes
router.get('/store/:slug', getPublicStore);
router.post('/store/:slug/whatsapp-click', trackWhatsAppClick);

module.exports = router;
