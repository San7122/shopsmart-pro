// Colors
export const COLORS = {
  primary: '#7c3aed',
  primaryDark: '#6d28d9',
  primaryLight: '#a78bfa',
  secondary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// Format currency in Indian Rupees
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  const d = new Date(date);
  
  const options = {
    short: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    datetime: { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    },
    time: { hour: '2-digit', minute: '2-digit' },
  };

  return d.toLocaleDateString('en-IN', options[format] || options.short);
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Get avatar background color based on name
export const getAvatarColor = (name) => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16',
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#d946ef', '#ec4899', '#f43f5e',
  ];
  
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Get stock status
export const getStockStatus = (stock, lowStockAlert = 10) => {
  if (stock <= 0) {
    return { label: 'Out of Stock', color: 'danger', bgColor: '#fef2f2' };
  } else if (stock <= lowStockAlert) {
    return { label: 'Low Stock', color: 'warning', bgColor: '#fffbeb' };
  }
  return { label: 'In Stock', color: 'success', bgColor: '#f0fdf4' };
};

// Validate phone number (Indian)
export const validatePhone = (phone) => {
  return /^[6-9]\d{9}$/.test(phone);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Generate WhatsApp message link
export const generateWhatsAppLink = (phone, message) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const indianPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${indianPhone}?text=${encodedMessage}`;
};

// Generate store share message
export const generateStoreShareMessage = (shopName, storeUrl) => {
  return `🛒 Visit ${shopName}'s online store!\n\n` +
    `Browse products, check prices, and order easily.\n\n` +
    `👉 ${storeUrl}\n\n` +
    `Powered by ShopSmart Pro`;
};

// Generate payment reminder message
export const generatePaymentReminder = (customerName, amount, shopName) => {
  return `🙏 नमस्ते ${customerName} जी,\n\n` +
    `आपके खाते में ₹${amount} बकाया है।\n\n` +
    `कृपया जल्द से जल्द भुगतान करें।\n\n` +
    `धन्यवाद,\n${shopName}\n\n` +
    `---\n` +
    `Dear ${customerName},\n\n` +
    `Your pending balance is ₹${amount}.\n\n` +
    `Please clear your dues at the earliest.\n\n` +
    `Thank you,\n${shopName}`;
};
