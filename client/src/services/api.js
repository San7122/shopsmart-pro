import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data)
}

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getTransactions: (id, params) => api.get(`/customers/${id}/transactions`, { params })
}

// Transactions API
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getOne: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  delete: (id, reason) => api.delete(`/transactions/${id}`, { data: { reason } }),
  getTodaySummary: () => api.get('/transactions/today')
}

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getOne: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  createDefaults: () => api.post('/categories/defaults')
}

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/alerts/low-stock'),
  getExpiring: () => api.get('/products/alerts/expiring')
}

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTransactions: (params) => api.get('/analytics/transactions', { params }),
  getInventory: () => api.get('/analytics/inventory'),
  getCustomers: () => api.get('/analytics/customers')
}

// Subscriptions API
export const subscriptionsAPI = {
  getPlans: (country) => api.get('/subscriptions/plans', { params: { country } }),
  getMySubscription: () => api.get('/subscriptions/me'),
  startTrial: (plan) => api.post('/subscriptions/start-trial', { plan }),
  createSubscription: (plan) => api.post('/subscriptions/create', { plan }),
  verifyPayment: (data) => api.post('/subscriptions/verify', data),
  cancelSubscription: (data) => api.post('/subscriptions/cancel', data),
  getBillingHistory: () => api.get('/subscriptions/billing-history'),
  checkAccess: (feature) => api.get(`/subscriptions/check-access/${feature}`)
}

// Alternative Payments API (UPI, Bank Transfer, eSewa, Khalti)
export const paymentsAPI = {
  // Get available payment methods for a country
  getMethods: (country) => api.get('/payments/methods', { params: { country } }),

  // UPI Payment (India)
  initiateUpi: (data) => api.post('/payments/upi/initiate', data),
  submitUpiProof: (data) => api.post('/payments/upi/submit-proof', data),

  // Bank Transfer (India & Nepal)
  initiateBankTransfer: (data) => api.post('/payments/bank-transfer/initiate', data),
  submitBankTransferProof: (data) => api.post('/payments/bank-transfer/submit-proof', data),

  // eSewa (Nepal)
  initiateEsewa: (data) => api.post('/payments/esewa/initiate', data),
  verifyEsewa: (data) => api.post('/payments/esewa/verify', data),

  // Khalti (Nepal)
  initiateKhalti: (data) => api.post('/payments/khalti/initiate', data),
  verifyKhalti: (data) => api.post('/payments/khalti/verify', data),

  // User's pending payments
  getMyPending: () => api.get('/payments/my-pending'),

  // Admin: Verify manual payments
  getPending: () => api.get('/payments/pending'),
  verifyPayment: (paymentId, data) => api.post(`/payments/verify/${paymentId}`, data)
}
