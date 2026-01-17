// Invoice Routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getInvoices,
  getInvoice,
  createInvoice,
  recordPayment,
  generatePDF,
  sendWhatsApp,
  deleteInvoice
} = require('../controllers/invoiceController');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoice)
  .delete(deleteInvoice);

router.post('/:id/payment', recordPayment);
router.get('/:id/pdf', generatePDF);
router.post('/:id/send-whatsapp', sendWhatsApp);

module.exports = router;
