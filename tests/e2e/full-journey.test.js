/**
 * ShopSmart Pro - End-to-End Test Suite
 * Complete user journey testing
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server/server');

// Test data
let authToken = '';
let userId = '';
let customerId = '';
let productId = '';
let transactionId = '';
let invoiceId = '';

const testUser = {
  name: 'Test Shopkeeper',
  phone: '9999999999',
  password: 'Test@123456',
  shopName: 'Test Kirana Store',
  shopType: 'kirana',
  address: {
    street: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001'
  }
};

const testCustomer = {
  name: 'Test Customer',
  phone: '8888888888',
  address: 'Test Address, Mumbai'
};

const testProduct = {
  name: 'Test Product',
  brand: 'Test Brand',
  barcode: '1234567890123',
  unit: 'pcs',
  sellingPrice: 100,
  costPrice: 80,
  mrp: 120,
  stock: 50,
  minStock: 10
};

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeAll(async () => {
  // Connect to test database
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shopsmart-test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up test data
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
});

// ============================================================
// TEST SUITES
// ============================================================

describe('🔐 Authentication Flow', () => {
  
  test('POST /api/auth/register - Should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);
    
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe(testUser.name);
    
    authToken = res.body.token;
    userId = res.body.user._id;
  });

  test('POST /api/auth/register - Should reject duplicate phone', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(400);
    
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - Should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: testUser.phone,
        password: testUser.password
      })
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    
    authToken = res.body.token;
  });

  test('POST /api/auth/login - Should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: testUser.phone,
        password: 'wrongpassword'
      })
      .expect(401);
    
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Should return current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe(testUser.phone);
  });

  test('GET /api/auth/me - Should reject without token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);
    
    expect(res.body.success).toBe(false);
  });
});

describe('👥 Customer Management', () => {
  
  test('POST /api/customers - Should create customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testCustomer)
      .expect(201);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(testCustomer.name);
    expect(res.body.data.balance).toBe(0);
    
    customerId = res.body.data._id;
  });

  test('GET /api/customers - Should list customers', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/customers/:id - Should get single customer', async () => {
    const res = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(customerId);
  });

  test('PUT /api/customers/:id - Should update customer', async () => {
    const res = await request(app)
      .put(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Updated Customer Name' })
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Customer Name');
  });

  test('GET /api/customers/search - Should search customers', async () => {
    const res = await request(app)
      .get('/api/customers/search?q=Updated')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
  });
});

describe('📦 Product Management', () => {
  
  test('POST /api/products - Should create product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testProduct)
      .expect(201);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(testProduct.name);
    
    productId = res.body.data._id;
  });

  test('GET /api/products - Should list products', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('PUT /api/products/:id/stock - Should update stock', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ quantity: 25, type: 'add' })
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.stock).toBe(75); // 50 + 25
  });

  test('GET /api/products/low-stock - Should get low stock products', async () => {
    const res = await request(app)
      .get('/api/products/low-stock')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
  });
});

describe('💰 Transaction Flow', () => {
  
  test('POST /api/transactions - Should create credit transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        type: 'credit',
        amount: 500,
        description: 'Test credit'
      })
      .expect(201);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('credit');
    expect(res.body.data.amount).toBe(500);
    expect(res.body.data.balanceAfter).toBe(500);
    
    transactionId = res.body.data._id;
  });

  test('POST /api/transactions - Should create payment transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        type: 'payment',
        amount: 200,
        paymentMethod: 'upi',
        description: 'Test payment'
      })
      .expect(201);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('payment');
    expect(res.body.data.balanceAfter).toBe(300); // 500 - 200
  });

  test('GET /api/transactions - Should list transactions', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  test('GET /api/transactions/customer/:id - Should get customer transactions', async () => {
    const res = await request(app)
      .get(`/api/transactions/customer/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  test('GET /api/customers/:id - Customer balance should be updated', async () => {
    const res = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.data.balance).toBe(300);
  });
});

describe('🧾 Invoice Management', () => {
  
  test('POST /api/invoices - Should create invoice', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        items: [
          {
            product: productId,
            name: testProduct.name,
            quantity: 2,
            price: testProduct.sellingPrice,
            total: 200
          }
        ],
        subtotal: 200,
        discount: 0,
        tax: 36,
        grandTotal: 236
      })
      .expect(201);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toBeDefined();
    
    invoiceId = res.body.data._id;
  });

  test('GET /api/invoices - Should list invoices', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/invoices/:id - Should get single invoice', async () => {
    const res = await request(app)
      .get(`/api/invoices/${invoiceId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(invoiceId);
  });
});

describe('📊 Analytics & Reports', () => {
  
  test('GET /api/analytics/dashboard - Should get dashboard stats', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCustomers).toBeDefined();
    expect(res.body.data.totalReceivables).toBeDefined();
  });

  test('GET /api/analytics/transactions - Should get transaction summary', async () => {
    const res = await request(app)
      .get('/api/analytics/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
  });

  test('GET /api/analytics/customers/top - Should get top customers', async () => {
    const res = await request(app)
      .get('/api/analytics/customers/top')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
  });
});

describe('🏪 Storefront (Public)', () => {
  let storeSlug = '';
  
  test('GET /api/auth/me - Should have store slug', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    storeSlug = res.body.data.storeSlug;
    expect(storeSlug).toBeDefined();
  });

  test('GET /api/store/:slug - Should get public store', async () => {
    if (!storeSlug) return;
    
    const res = await request(app)
      .get(`/api/store/${storeSlug}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
    expect(res.body.data.shopName).toBe(testUser.shopName);
  });

  test('GET /api/store/:slug/products - Should get store products', async () => {
    if (!storeSlug) return;
    
    const res = await request(app)
      .get(`/api/store/${storeSlug}/products`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
  });
});

describe('❌ Error Handling', () => {
  
  test('GET /api/invalid-route - Should return 404', async () => {
    const res = await request(app)
      .get('/api/invalid-route')
      .expect(404);
    
    expect(res.body.success).toBe(false);
  });

  test('GET /api/customers/:id - Should handle invalid ID', async () => {
    const res = await request(app)
      .get('/api/customers/invalidid')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
    
    expect(res.body.success).toBe(false);
  });

  test('POST /api/transactions - Should validate required fields', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400);
    
    expect(res.body.success).toBe(false);
  });
});

describe('🗑️ Cleanup Operations', () => {
  
  test('DELETE /api/customers/:id - Should delete customer', async () => {
    const res = await request(app)
      .delete(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/products/:id - Should delete product', async () => {
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    expect(res.body.success).toBe(true);
  });
});

// ============================================================
// PERFORMANCE TESTS
// ============================================================

describe('⚡ Performance Tests', () => {
  
  test('Health check should respond within 100ms', async () => {
    const start = Date.now();
    await request(app)
      .get('/api/health')
      .expect(200);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });

  test('Should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() =>
      request(app)
        .get('/api/health')
        .expect(200)
    );
    
    const results = await Promise.all(requests);
    results.forEach(res => {
      expect(res.body.success).toBe(true);
    });
  });
});
