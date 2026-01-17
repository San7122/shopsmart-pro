const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customer, startDate, endDate } = req.query;
    
    const query = { user: req.user._id };
    
    if (status) query.paymentStatus = status;
    if (customer) query.customer = customer;
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }
    
    const invoices = await Invoice.find(query)
      .populate('customer', 'name phone')
      .sort({ invoiceDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Invoice.countDocuments(query);
    
    // Get summary
    const summary = await Invoice.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          totalPending: { $sum: '$balanceDue' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: invoices,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      summary: summary[0] || { totalInvoices: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    .populate('customer', 'name phone email address')
    .populate('items.product', 'name brand');
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const { customerId, items, dueDate, notes, terms, paymentMethod } = req.body;
    
    // Verify customer
    const customer = await Customer.findOne({ _id: customerId, user: req.user._id });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    // Process items
    const processedItems = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    for (const item of items) {
      let product = null;
      if (item.productId) {
        product = await Product.findOne({ _id: item.productId, user: req.user._id });
      }
      
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice || product?.sellingPrice || 0);
      const discount = parseFloat(item.discount || 0);
      const tax = parseFloat(item.tax || 0);
      const lineTotal = (quantity * unitPrice) - discount + tax;
      
      processedItems.push({
        product: product?._id,
        name: item.name || product?.name,
        description: item.description,
        quantity,
        unit: item.unit || product?.unit || 'pcs',
        unitPrice,
        discount,
        tax,
        total: lineTotal
      });
      
      subtotal += quantity * unitPrice;
      totalDiscount += discount;
      totalTax += tax;
      
      // Update product stock if product exists
      if (product) {
        product.stock -= quantity;
        product.totalSold = (product.totalSold || 0) + quantity;
        product.lastSoldAt = new Date();
        await product.save();
      }
    }
    
    const grandTotal = subtotal - totalDiscount + totalTax;
    
    const invoice = await Invoice.create({
      user: req.user._id,
      customer: customerId,
      items: processedItems,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      balanceDue: grandTotal,
      dueDate,
      notes,
      terms,
      paymentMethod
    });
    
    // If payment method is credit, create a transaction
    if (paymentMethod === 'credit') {
      await Transaction.create({
        user: req.user._id,
        customer: customerId,
        type: 'credit',
        amount: grandTotal,
        description: `Invoice #${invoice.invoiceNumber}`,
        invoice: invoice._id,
        balanceAfter: customer.balance + grandTotal
      });
      
      customer.balance += grandTotal;
      customer.totalCredit += grandTotal;
      await customer.save();
    }
    
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone')
      .populate('items.product', 'name');
    
    res.status(201).json({ success: true, data: populatedInvoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Record payment for invoice
// @route   POST /api/invoices/:id/payment
// @access  Private
exports.recordPayment = async (req, res) => {
  try {
    const { amount, paymentMethod = 'cash' } = req.body;
    
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid payment amount' });
    }
    
    if (amount > invoice.balanceDue) {
      return res.status(400).json({ success: false, error: 'Payment exceeds balance due' });
    }
    
    invoice.amountPaid += amount;
    invoice.balanceDue = invoice.grandTotal - invoice.amountPaid;
    
    if (invoice.balanceDue <= 0) {
      invoice.paymentStatus = 'paid';
      invoice.paidAt = new Date();
    } else {
      invoice.paymentStatus = 'partial';
    }
    
    await invoice.save();
    
    // Create transaction record
    const customer = await Customer.findById(invoice.customer);
    if (customer) {
      await Transaction.create({
        user: req.user._id,
        customer: invoice.customer,
        type: 'payment',
        amount,
        paymentMethod,
        description: `Payment for Invoice #${invoice.invoiceNumber}`,
        invoice: invoice._id,
        balanceAfter: customer.balance - amount
      });
      
      customer.balance -= amount;
      customer.totalPaid += amount;
      await customer.save();
    }
    
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Generate invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
exports.generatePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    .populate('customer', 'name phone email address')
    .populate('user', 'name shopName phone email address gstNumber');
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    // Generate HTML for PDF
    const html = generateInvoiceHTML(invoice);
    
    // In production, use puppeteer or similar to generate actual PDF
    // For now, return HTML that can be printed
    res.json({
      success: true,
      data: {
        html,
        invoice
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Send invoice via WhatsApp
// @route   POST /api/invoices/:id/send-whatsapp
// @access  Private
exports.sendWhatsApp = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('customer', 'name phone');
    
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    
    if (!invoice.customer.phone) {
      return res.status(400).json({ success: false, error: 'Customer phone number not available' });
    }
    
    // Generate WhatsApp message
    const message = `🧾 *Invoice #${invoice.invoiceNumber}*\n\n` +
      `Dear ${invoice.customer.name},\n\n` +
      `Total Amount: ₹${invoice.grandTotal.toLocaleString('en-IN')}\n` +
      `Amount Paid: ₹${invoice.amountPaid.toLocaleString('en-IN')}\n` +
      `Balance Due: ₹${invoice.balanceDue.toLocaleString('en-IN')}\n\n` +
      `Thank you for your business!\n\n` +
      `- ${req.user.shopName}`;
    
    const phone = invoice.customer.phone.replace(/\D/g, '');
    const indianPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const whatsappUrl = `https://wa.me/${indianPhone}?text=${encodeURIComponent(message)}`;
    
    // Update invoice status
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();
    
    res.json({
      success: true,
      data: {
        whatsappUrl,
        message
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
      paymentStatus: { $in: ['pending', 'draft'] }
    });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invoice not found or cannot be deleted (already paid)' 
      });
    }
    
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper function to generate invoice HTML
function generateInvoiceHTML(invoice) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice #${invoice.invoiceNumber}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; color: #333; }
    .invoice { max-width: 800px; margin: 0 auto; padding: 30px; border: 1px solid #eee; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .shop-name { font-size: 24px; font-weight: bold; color: #7c3aed; }
    .invoice-title { font-size: 28px; color: #333; }
    .invoice-number { color: #666; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { flex: 1; }
    .info-label { font-weight: 600; color: #666; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .totals { text-align: right; }
    .totals-row { margin: 8px 0; }
    .grand-total { font-size: 24px; font-weight: bold; color: #7c3aed; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="shop-name">${invoice.user.shopName}</div>
        <div>${invoice.user.address || ''}</div>
        <div>Phone: ${invoice.user.phone}</div>
        ${invoice.user.gstNumber ? `<div>GST: ${invoice.user.gstNumber}</div>` : ''}
      </div>
      <div style="text-align: right;">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">#${invoice.invoiceNumber}</div>
        <div>Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
        ${invoice.dueDate ? `<div>Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>` : ''}
      </div>
    </div>
    
    <div class="info-section">
      <div class="info-box">
        <div class="info-label">Bill To:</div>
        <div><strong>${invoice.customer.name}</strong></div>
        <div>${invoice.customer.phone || ''}</div>
        <div>${invoice.customer.address || ''}</div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.name}${item.description ? `<br><small>${item.description}</small>` : ''}</td>
            <td>${item.quantity} ${item.unit}</td>
            <td>₹${item.unitPrice.toLocaleString('en-IN')}</td>
            <td>₹${item.total.toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-row">Subtotal: ₹${invoice.subtotal.toLocaleString('en-IN')}</div>
      ${invoice.totalDiscount > 0 ? `<div class="totals-row">Discount: -₹${invoice.totalDiscount.toLocaleString('en-IN')}</div>` : ''}
      ${invoice.totalTax > 0 ? `<div class="totals-row">Tax: ₹${invoice.totalTax.toLocaleString('en-IN')}</div>` : ''}
      <div class="totals-row grand-total">Total: ₹${invoice.grandTotal.toLocaleString('en-IN')}</div>
      ${invoice.amountPaid > 0 ? `<div class="totals-row">Paid: ₹${invoice.amountPaid.toLocaleString('en-IN')}</div>` : ''}
      ${invoice.balanceDue > 0 ? `<div class="totals-row" style="color: #dc3545;">Balance Due: ₹${invoice.balanceDue.toLocaleString('en-IN')}</div>` : ''}
    </div>
    
    ${invoice.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
    ${invoice.terms ? `<div style="margin-top: 20px;"><strong>Terms:</strong><br>${invoice.terms}</div>` : ''}
    
    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Generated by ShopSmart Pro</p>
    </div>
  </div>
</body>
</html>
  `;
}
