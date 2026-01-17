const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Supported Countries Configuration
const COUNTRIES = {
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    phoneCode: '+91',
    phoneRegex: /^[6-9]\d{9}$/,
    phoneLength: 10,
    taxName: 'GST',
    taxRegex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    language: 'hi',
    timezone: 'Asia/Kolkata'
  },
  NP: {
    code: 'NP',
    name: 'Nepal',
    currency: 'NPR',
    currencySymbol: 'रू',
    phoneCode: '+977',
    phoneRegex: /^9[78]\d{8}$/,  // Nepal mobile numbers start with 97 or 98
    phoneLength: 10,
    taxName: 'PAN',
    taxRegex: /^\d{9}$/,  // Nepal PAN is 9 digits
    language: 'ne',
    timezone: 'Asia/Kathmandu'
  }
};

// Currency conversion rate (approximate - update regularly or use API)
// 1 INR ≈ 1.6 NPR
const CURRENCY_RATES = {
  INR_TO_NPR: 1.6,
  NPR_TO_INR: 0.625
};

// Base prices in INR (converted for Nepal)
const BASE_PRICES = {
  pro_monthly: 299,
  pro_yearly: 2999,
  business_monthly: 599,
  business_yearly: 5999
};

// Get price for a country
const getPriceForCountry = (basePriceINR, country) => {
  if (country === 'NP') {
    // Convert to NPR and round to nearest 50
    const nprPrice = Math.round((basePriceINR * CURRENCY_RATES.INR_TO_NPR) / 50) * 50;
    return nprPrice;
  }
  return basePriceINR;
};

// Subscription Plans Configuration (with country support)
const getPlansForCountry = (countryCode = 'IN') => {
  const country = COUNTRIES[countryCode] || COUNTRIES.IN;
  const currency = country.currency;
  const symbol = country.currencySymbol;

  // Calculate prices based on country
  const proMonthly = getPriceForCountry(BASE_PRICES.pro_monthly, countryCode);
  const proYearly = getPriceForCountry(BASE_PRICES.pro_yearly, countryCode);
  const businessMonthly = getPriceForCountry(BASE_PRICES.business_monthly, countryCode);
  const businessYearly = getPriceForCountry(BASE_PRICES.business_yearly, countryCode);

  return {
    monthly: {
      free: {
        name: 'Free Plan',
        description: 'Basic features to get started',
        amount: 0,
        displayPrice: `${symbol}0`,
        currency: currency,
        features: [
          'Up to 50 Customers',
          'Up to 50 Products',
          'Basic Dashboard',
          'Transaction Tracking'
        ],
        limits: {
          customers: 50,
          products: 50,
          invoicesPerMonth: 10,
          staffAccounts: 0
        }
      },
      pro: {
        name: 'Pro Plan',
        description: 'Unlimited customers, products, invoices & reports',
        amount: proMonthly * 100, // In paise/paisa
        displayPrice: `${symbol}${proMonthly}`,
        currency: currency,
        interval: 1,
        period: 'monthly',
        trialDays: 30,
        features: [
          'Unlimited Customers',
          'Unlimited Products',
          'Invoice Generation',
          'WhatsApp Reminders',
          'Analytics & Reports',
          'Export Data',
          'Priority Support'
        ],
        limits: {
          customers: -1,
          products: -1,
          invoicesPerMonth: -1,
          staffAccounts: 2
        }
      },
      business: {
        name: 'Business Plan',
        description: 'Multi-location, staff accounts, API access',
        amount: businessMonthly * 100,
        displayPrice: `${symbol}${businessMonthly}`,
        currency: currency,
        interval: 1,
        period: 'monthly',
        trialDays: 30,
        features: [
          'Everything in Pro',
          'Multiple Store Locations',
          'Up to 10 Staff Accounts',
          'API Access',
          'Advanced Analytics',
          'Custom Branding',
          'Dedicated Support',
          'Data Backup'
        ],
        limits: {
          customers: -1,
          products: -1,
          invoicesPerMonth: -1,
          staffAccounts: 10,
          locations: 5
        }
      }
    },
    yearly: {
      pro_yearly: {
        name: 'Pro Plan (Yearly)',
        description: 'Unlimited customers, products, invoices & reports',
        amount: proYearly * 100,
        displayPrice: `${symbol}${proYearly}`,
        currency: currency,
        interval: 12,
        period: 'yearly',
        trialDays: 30,
        savings: `${symbol}${(proMonthly * 12) - proYearly} saved`,
        features: [
          'Unlimited Customers',
          'Unlimited Products',
          'Invoice Generation',
          'WhatsApp Reminders',
          'Analytics & Reports',
          'Export Data',
          'Priority Support'
        ],
        limits: {
          customers: -1,
          products: -1,
          invoicesPerMonth: -1,
          staffAccounts: 2
        }
      },
      business_yearly: {
        name: 'Business Plan (Yearly)',
        description: 'Multi-location, staff accounts, API access',
        amount: businessYearly * 100,
        displayPrice: `${symbol}${businessYearly}`,
        currency: currency,
        interval: 12,
        period: 'yearly',
        trialDays: 30,
        savings: `${symbol}${(businessMonthly * 12) - businessYearly} saved`,
        features: [
          'Everything in Pro',
          'Multiple Store Locations',
          'Up to 10 Staff Accounts',
          'API Access',
          'Advanced Analytics',
          'Custom Branding',
          'Dedicated Support',
          'Data Backup'
        ],
        limits: {
          customers: -1,
          products: -1,
          invoicesPerMonth: -1,
          staffAccounts: 10,
          locations: 5
        }
      }
    }
  };
};

// Default plans (for backward compatibility)
const PLANS = getPlansForCountry('IN').monthly;
const YEARLY_PLANS = getPlansForCountry('IN').yearly;

// Payment gateway info by country
const PAYMENT_GATEWAYS = {
  IN: {
    primary: 'razorpay',
    methods: ['card', 'upi', 'netbanking', 'wallet'],
    upiApps: ['gpay', 'phonepe', 'paytm', 'bhim']
  },
  NP: {
    primary: 'razorpay', // Razorpay works in Nepal for INR
    // Alternative: eSewa, Khalti, IME Pay for NPR
    methods: ['card', 'netbanking'],
    localGateways: ['esewa', 'khalti', 'imepay', 'connectips'],
    note: 'Nepal users can pay in INR via Razorpay or use local gateways'
  }
};

module.exports = {
  razorpay,
  COUNTRIES,
  CURRENCY_RATES,
  PLANS,
  YEARLY_PLANS,
  getPlansForCountry,
  getPriceForCountry,
  PAYMENT_GATEWAYS
};
