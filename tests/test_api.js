/**
 * API Tests for ShopSmart Pro
 * Tests for all API endpoints with various input scenarios
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import server app
const app = require('../server/server');
const User = require('../server/models/User');

describe('API Endpoint Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_test_api';
    await mongoose.connect(DB_URI);

    // Create a test user and generate auth token
    testUser = await User.create({
      name: 'Test User',
      phone: '9876543210',
      shopName: 'Test Shop',
      password: 'password123',
      email: 'test@example.com'
    });

    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  // AUTH ENDPOINTS TESTS
  describe('Auth API Endpoints', () => {
    test('POST /api/auth/register - should register a new user with valid data', async () => {
      const userData = {
        name: 'New Test User',
        phone: '9876543211',
        shopName: 'New Test Shop',
        password: 'newpassword123',
        email: 'newtest@example.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(userData.name);
    });

    test('POST /api/auth/register - should fail with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(500); // Note: This might return 500 due to validation, need to check actual implementation

      // Adjust based on actual server response - might be 400
      expect(response.body.success).toBe(false);
    });

    test('POST /api/auth/register - should fail with invalid data types', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 12345, // Invalid type
          phone: 'invalid-phone',
          password: 'short' // Too short
        })
        .expect(500); // Expecting error for invalid data

      expect(response.body.success).toBe(false);
    });

    test('POST /api/auth/login - should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '9876543210',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    test('POST /api/auth/login - should fail with wrong credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '9876543210',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('GET /api/auth/me - should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(testUser._id.toString());
    });

    test('GET /api/auth/me - should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // CUSTOMER API ENDPOINTS TESTS
  describe('Customer API Endpoints', () => {
    test('GET /api/customers - should return customers with valid token', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/customers - should create a customer with valid data', async () => {
      const customerData = {
        name: 'Test Customer',
        phone: '9876543212',
        email: 'customer@test.com'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(customerData.name);
    });

    test('POST /api/customers - should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(500); // This depends on validation implementation

      expect(response.body.success).toBe(false);
    });

    test('POST /api/customers - should fail with invalid data types', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 123, // Invalid type
          phone: 456 // Invalid type
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/customers/:id - should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .get('/api/customers/507f1f77bcf86cd799439011') // Invalid ID
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // PRODUCT API ENDPOINTS TESTS
  describe('Product API Endpoints', () => {
    test('GET /api/products - should return products with valid token', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/products - should create a product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        sellingPrice: 100,
        stock: 10
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(productData.name);
    });

    test('POST /api/products - should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(500); // This depends on validation implementation

      expect(response.body.success).toBe(false);
    });

    test('GET /api/products/:id - should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011') // Invalid ID
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // TRANSACTION API ENDPOINTS TESTS
  describe('Transaction API Endpoints', () => {
    test('GET /api/transactions - should return transactions with valid token', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/transactions - should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(500); // This depends on validation implementation

      expect(response.body.success).toBe(false);
    });
  });

  // ANALYTICS API ENDPOINTS TESTS
  describe('Analytics API Endpoints', () => {
    test('GET /api/analytics/dashboard - should return dashboard data with valid token', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // INVALID ENDPOINT TESTS
  describe('Non-existent Endpoints', () => {
    test('GET /api/nonexistent - should return 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });
  });
});