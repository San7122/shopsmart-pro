/**
 * Backend API Tests - Comprehensive API endpoint testing
 * Tests all routes with valid/invalid data, authentication, and edge cases
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import server app and models
const app = require('../../server/server');
const User = require('../../server/models/User');
const Customer = require('../../server/models/Customer');
const Product = require('../../server/models/Product');

describe('Backend API Comprehensive Tests', () => {
  let authToken;
  let testUser;
  let testCustomerId;
  let testProductId;

  beforeAll(async () => {
    // Connect to test database
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_backend_test';
    await mongoose.connect(DB_URI);

    // Create test user
    testUser = await User.create({
      name: 'API Test User',
      phone: '9998887777',
      shopName: 'API Test Shop',
      password: 'testpassword123',
      email: 'api@test.com'
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await mongoose.connection.close();
  });

  // ============================================================
  // AUTHENTICATION ENDPOINT TESTS
  // ============================================================
  describe('Authentication API Tests', () => {
    test('POST /api/auth/register - should register user with valid data', async () => {
      const userData = {
        name: 'New API User',
        phone: '9998887778',
        shopName: 'New API Shop',
        password: 'newpassword123',
        email: 'newapi@test.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.token).toBeDefined();
    });

    test('POST /api/auth/register - should reject duplicate phone number', async () => {
      const userData = {
        name: 'Duplicate User',
        phone: '9998887777', // Same as testUser
        shopName: 'Duplicate Shop',
        password: 'duplicate123',
        email: 'duplicate@test.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });

    test('POST /api/auth/register - should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({}) // Empty body
        .expect(500); // Will likely fail due to validation

      expect(response.body.success).toBe(false);
    });

    test('POST /api/auth/register - should reject invalid data types', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 12345, // Invalid type
          phone: 'invalid-phone',
          password: 'short' // Too short
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('POST /api/auth/login - should authenticate valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '9998887777',
          password: 'testpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.data.phone).toBe('9998887777');
    });

    test('POST /api/auth/login - should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '9998887777',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('POST /api/auth/login - should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('provide');
    });

    test('GET /api/auth/me - should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testUser._id.toString());
    });

    test('GET /api/auth/me - should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authorized');
    });

    test('GET /api/auth/me - should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // CUSTOMER ENDPOINT TESTS
  // ============================================================
  describe('Customer API Tests', () => {
    test('POST /api/customers - should create customer with valid data', async () => {
      const customerData = {
        name: 'API Test Customer',
        phone: '9998887779',
        email: 'customer@api.com',
        address: 'Test Address'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(customerData.name);
      expect(response.body.data.user.toString()).toBe(testUser._id.toString());
      
      testCustomerId = response.body.data._id;
    });

    test('POST /api/customers - should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/customers')
        .send({ name: 'Test Customer' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('POST /api/customers - should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Empty body
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/customers - should return customer list', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/customers/:id - should return specific customer', async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testCustomerId);
    });

    test('GET /api/customers/:id - should return 404 for non-existent customer', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/customers/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('PUT /api/customers/:id - should update customer', async () => {
      const updateData = { name: 'Updated Customer Name' };
      
      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    test('DELETE /api/customers/:id - should delete customer', async () => {
      const response = await request(app)
        .delete(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testCustomerId);
    });
  });

  // ============================================================
  // PRODUCT ENDPOINT TESTS
  // ============================================================
  describe('Product API Tests', () => {
    test('POST /api/products - should create product with valid data', async () => {
      const productData = {
        name: 'API Test Product',
        sellingPrice: 100,
        costPrice: 80,
        stock: 50,
        category: 'Test Category'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.sellingPrice).toBe(productData.sellingPrice);
      
      testProductId = response.body.data._id;
    });

    test('POST /api/products - should reject invalid numeric values', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Product',
          sellingPrice: -50, // Negative price
          stock: -10 // Negative stock
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/products - should return product list', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('PATCH /api/products/:id/stock - should update stock correctly', async () => {
      const stockUpdate = {
        type: 'add',
        adjustment: 10
      };

      const response = await request(app)
        .patch(`/api/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(stockUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stock).toBeGreaterThan(50); // Should be 60
    });

    test('GET /api/products/low-stock - should return low stock products', async () => {
      const response = await request(app)
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================
  // TRANSACTION ENDPOINT TESTS
  // ============================================================
  describe('Transaction API Tests', () => {
    test('POST /api/transactions - should create transaction with valid data', async () => {
      // First create a customer for the transaction
      const customer = await Customer.create({
        user: testUser._id,
        name: 'Transaction Customer',
        phone: '9998887780'
      });

      const transactionData = {
        customer: customer._id,
        type: 'sale',
        items: [{
          product: testProductId,
          quantity: 2,
          price: 100
        }],
        totalAmount: 200,
        paymentMethod: 'cash'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAmount).toBe(transactionData.totalAmount);
    });

    test('GET /api/transactions - should return transaction list', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/transactions/today - should return today\'s transactions', async () => {
      const response = await request(app)
        .get('/api/transactions/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================
  // ANALYTICS ENDPOINT TESTS
  // ============================================================
  describe('Analytics API Tests', () => {
    test('GET /api/analytics/dashboard - should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totals).toBeDefined();
    });

    test('GET /api/analytics/sales-report - should return sales data', async () => {
      const response = await request(app)
        .get('/api/analytics/sales-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/analytics/customer-insights - should return customer insights', async () => {
      const response = await request(app)
        .get('/api/analytics/customer-insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================
  describe('Error Handling Tests', () => {
    test('GET /api/nonexistent - should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    test('POST /api/customers - should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/customers/invalid-id-format - should handle invalid IDs gracefully', async () => {
      const response = await request(app)
        .get('/api/customers/invalid123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // SECURITY TESTS
  // ============================================================
  describe('Security Tests', () => {
    test('Should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('Should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('Should reject tokens signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { id: testUser._id },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});