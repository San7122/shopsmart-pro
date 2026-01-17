/**
 * Multiple Payment Gateway Configuration
 * For users without credit/debit cards
 *
 * Supported Methods:
 * 1. UPI (India) - GPay, PhonePe, Paytm, BHIM
 * 2. eSewa (Nepal) - Most popular in Nepal
 * 3. Khalti (Nepal) - Second most popular
 * 4. Bank Transfer - Manual verification
 * 5. Razorpay - Cards, Netbanking, Wallets
 */

// ============================================================
// UPI PAYMENT (India - No Card Required)
// ============================================================

const UPI_CONFIG = {
  // Your UPI ID for receiving payments
  merchantUpiId: process.env.UPI_MERCHANT_ID || 'shopsmart@upi',
  merchantName: 'ShopSmart Pro',

  // Generate UPI payment link
  generateUpiLink: (amount, orderId, customerName) => {
    const upiId = process.env.UPI_MERCHANT_ID || 'shopsmart@upi';
    const name = encodeURIComponent('ShopSmart Pro');
    const note = encodeURIComponent(`Subscription - ${orderId}`);

    // UPI Deep Link (works with all UPI apps)
    return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}&tr=${orderId}`;
  },

  // Generate QR Code data for UPI
  generateQrData: (amount, orderId) => {
    const upiId = process.env.UPI_MERCHANT_ID || 'shopsmart@upi';
    return `upi://pay?pa=${upiId}&pn=ShopSmart%20Pro&am=${amount}&cu=INR&tn=Subscription&tr=${orderId}`;
  }
};

// ============================================================
// ESEWA (Nepal - Most Popular)
// ============================================================

const ESEWA_CONFIG = {
  merchantId: process.env.ESEWA_MERCHANT_ID,
  secretKey: process.env.ESEWA_SECRET_KEY,
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://esewa.com.np/epay/main'
    : 'https://uat.esewa.com.np/epay/main',
  verifyUrl: process.env.NODE_ENV === 'production'
    ? 'https://esewa.com.np/epay/transrec'
    : 'https://uat.esewa.com.np/epay/transrec',

  // Generate eSewa payment form data
  generatePaymentData: (amount, orderId, successUrl, failureUrl) => {
    return {
      amt: amount,
      psc: 0, // Service charge
      pdc: 0, // Delivery charge
      txAmt: 0, // Tax
      tAmt: amount, // Total amount
      pid: orderId, // Product/Order ID
      scd: process.env.ESEWA_MERCHANT_ID, // Merchant code
      su: successUrl, // Success URL
      fu: failureUrl  // Failure URL
    };
  }
};

// ============================================================
// KHALTI (Nepal - Second Most Popular)
// ============================================================

const KHALTI_CONFIG = {
  publicKey: process.env.KHALTI_PUBLIC_KEY,
  secretKey: process.env.KHALTI_SECRET_KEY,
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://khalti.com/api/v2'
    : 'https://a.khalti.com/api/v2',

  // Initiate Khalti payment
  initiatePayment: async (amount, orderId, customerInfo, returnUrl) => {
    // Amount in paisa (1 NPR = 100 paisa)
    return {
      return_url: returnUrl,
      website_url: process.env.FRONTEND_URL || 'https://shopsmart.pro',
      amount: amount * 100, // Convert to paisa
      purchase_order_id: orderId,
      purchase_order_name: 'ShopSmart Pro Subscription',
      customer_info: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone
      }
    };
  }
};

// ============================================================
// BANK TRANSFER (Manual - Both Countries)
// ============================================================

const BANK_TRANSFER_CONFIG = {
  india: {
    bankName: 'State Bank of India', // Replace with your bank
    accountName: 'ShopSmart Technologies Pvt Ltd',
    accountNumber: process.env.BANK_ACCOUNT_IN || 'XXXXXXXXXX',
    ifscCode: process.env.BANK_IFSC_IN || 'SBIN0XXXXXX',
    upiId: process.env.UPI_MERCHANT_ID || 'shopsmart@upi',
    instructions: [
      'Transfer the exact amount to the account above',
      'Use your Phone Number as payment reference',
      'Send screenshot to WhatsApp: +91-XXXXXXXXXX',
      'Account will be activated within 2 hours'
    ]
  },
  nepal: {
    bankName: 'Nepal Investment Bank', // Replace with your bank
    accountName: 'ShopSmart Nepal',
    accountNumber: process.env.BANK_ACCOUNT_NP || 'XXXXXXXXXX',
    branchName: 'Kathmandu',
    instructions: [
      'Transfer the exact amount to the account above',
      'Use your Phone Number as payment reference',
      'Send voucher photo to WhatsApp: +977-XXXXXXXXXX',
      'Account will be activated within 2 hours'
    ]
  }
};

// ============================================================
// PAYMENT METHOD AVAILABILITY BY COUNTRY
// ============================================================

const PAYMENT_METHODS = {
  IN: [
    {
      id: 'upi',
      name: 'UPI',
      description: 'GPay, PhonePe, Paytm, BHIM',
      icon: 'upi',
      popular: true,
      instant: true
    },
    {
      id: 'razorpay',
      name: 'Card / Netbanking',
      description: 'Credit Card, Debit Card, Net Banking',
      icon: 'card',
      popular: false,
      instant: true
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'NEFT / IMPS / UPI Transfer',
      icon: 'bank',
      popular: false,
      instant: false,
      note: 'Manual verification - 2 hours'
    }
  ],
  NP: [
    {
      id: 'esewa',
      name: 'eSewa',
      description: 'Pay with eSewa wallet',
      icon: 'esewa',
      popular: true,
      instant: true
    },
    {
      id: 'khalti',
      name: 'Khalti',
      description: 'Pay with Khalti wallet',
      icon: 'khalti',
      popular: true,
      instant: true
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Transfer to our bank account',
      icon: 'bank',
      popular: false,
      instant: false,
      note: 'Manual verification - 2 hours'
    },
    {
      id: 'razorpay',
      name: 'International Card',
      description: 'Visa / Mastercard',
      icon: 'card',
      popular: false,
      instant: true
    }
  ]
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getPaymentMethods = (country) => {
  return PAYMENT_METHODS[country] || PAYMENT_METHODS.IN;
};

const getBankDetails = (country) => {
  return BANK_TRANSFER_CONFIG[country === 'NP' ? 'nepal' : 'india'];
};

module.exports = {
  UPI_CONFIG,
  ESEWA_CONFIG,
  KHALTI_CONFIG,
  BANK_TRANSFER_CONFIG,
  PAYMENT_METHODS,
  getPaymentMethods,
  getBankDetails
};
