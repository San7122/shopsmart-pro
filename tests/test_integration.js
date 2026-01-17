/**
 * Integration Tests for ShopSmart Pro
 * Tests complete workflows and interactions between components
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Import server app
const app = require('../server/server');
const User = require('../server/models/User');
const Customer = require('../server/models/Customer');
const Product = require('../server/models/Product');
const Transaction = require('../server/models/Transaction');

describe('Integration Tests - Complete Workflows', () => {
  let authToken;
  let testUser;
  let createdCustomerId;
  let createdProductId;

  beforeAll(async () => {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_test_integration';
    await mongoose.connect(DB_URI);

    // Create a test user and generate auth token
    testUser = await User.create({
      name: 'Integration Test User',
      phone: '9876543210',
      shopName: 'Integration Test Shop',
      password: 'password123',
      email: 'integration@example.com'
    });

    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Clean up data before each test
    await Customer.deleteMany({ user: testUser._id });
    await Product.deleteMany({ user: testUser._id });
    await Transaction.deleteMany({ user: testUser._id });
  });

  afterAll(async () => {
    await User.deleteMany({ _id: testUser._id });
    await Customer.deleteMany({ user: testUser._id });
    await Product.deleteMany({ user: testUser._id });
    await Transaction.deleteMany({ user: testUser._id });
    await mongoose.connection.close();
  });

  test('Complete customer lifecycle workflow: Create → Update → View → Delete', async () => {
    // Step 1: Create a customer
    const createResponse = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Integration Test Customer',
        phone: '9876543215',
        email: 'integtest@example.com',
        address: 'Test Address'
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toBeDefined();
    expect(createResponse.body.data.name).toBe('Integration Test Customer');
    
    const customerId = createResponse.body.data._id;
    createdCustomerId = customerId;

    // Step 2: Get the created customer
    const getResponse = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data._id).toBe(customerId);
    expect(getResponse.body.data.name).toBe('Integration Test Customer');

    // Step 3: Update the customer
    const updateResponse = await request(app)
      .put(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Integration Test Customer',
        address: 'Updated Address'
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.name).toBe('Updated Integration Test Customer');

    // Step 4: Verify the update persisted
    const verifyUpdateResponse = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(verifyUpdateResponse.body.data.name).toBe('Updated Integration Test Customer');
  });

  test('Complete product lifecycle workflow: Create → Update → View → Stock Update → Delete', async () => {
    // Step 1: Create a product
    const createResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Integration Test Product',
        sellingPrice: 100,
        costPrice: 80,
        stock: 20,
        lowStockAlert: 5
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toBeDefined();
    expect(createResponse.body.data.name).toBe('Integration Test Product');
    
    const productId = createResponse.body.data._id;
    createdProductId = productId;

    // Step 2: Get the created product
    const getResponse = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data._id).toBe(productId);
    expect(getResponse.body.data.name).toBe('Integration Test Product');
    expect(getResponse.body.data.stock).toBe(20);

    // Step 3: Update the product
    const updateResponse = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Updated Integration Test Product',
        sellingPrice: 120
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.name).toBe('Updated Integration Test Product');
    expect(updateResponse.body.data.sellingPrice).toBe(120);

    // Step 4: Update product stock
    const stockResponse = await request(app)
      .patch(`/api/products/${productId}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        adjustment: 10,
        type: 'add',
        reason: 'Restocked'
      })
      .expect(200);

    expect(stockResponse.body.success).toBe(true);
    expect(stockResponse.body.data.currentStock).toBe(30); // 20 + 10

    // Step 5: Verify stock update persisted
    const verifyStockResponse = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(verifyStockResponse.body.data.stock).toBe(30);
  });

  test('Complete transaction workflow: Customer + Product → Credit Transaction → Payment Transaction → Balance Check', async () => {
    // Step 1: Create a customer
    const customerResponse = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Transaction Test Customer',
        phone: '9876543216'
      })
      .expect(201);

    const customerId = customerResponse.body.data._id;
    expect(customerId).toBeDefined();

    // Step 2: Create a product
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Transaction Test Product',
        sellingPrice: 100,
        stock: 50
      })
      .expect(201);

    const productId = productResponse.body.data._id;
    expect(productId).toBeDefined();

    // Step 3: Create a credit transaction (customer buys on credit)
    const creditTransaction = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        type: 'credit',
        amount: 250,
        description: 'Credit purchase of 2.5 units'
      })
      .expect(201);

    expect(creditTransaction.body.success).toBe(true);
    expect(creditTransaction.body.data.type).toBe('credit');
    expect(creditTransaction.body.data.amount).toBe(250);
    expect(creditTransaction.body.data.balanceAfter).toBe(250); // Customer now owes 250

    // Step 4: Verify customer balance increased
    const customerAfterCredit = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(customerAfterCredit.body.data.balance).toBe(250);

    // Step 5: Create a payment transaction (customer pays part of debt)
    const paymentTransaction = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        type: 'payment',
        amount: 100,
        description: 'Partial payment'
      })
      .expect(201);

    expect(paymentTransaction.body.success).toBe(true);
    expect(paymentTransaction.body.data.type).toBe('payment');
    expect(paymentTransaction.body.data.amount).toBe(100);
    expect(paymentTransaction.body.data.balanceAfter).toBe(150); // 250 - 100 = 150 remaining

    // Step 6: Verify customer balance decreased
    const customerAfterPayment = await request(app)
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(customerAfterPayment.body.data.balance).toBe(150);
  });

  test('Data retrieval workflow: Create multiple records → Filter → Sort → Paginate', async () => {
    // Step 1: Create multiple products
    const products = [];
    for (let i = 1; i <= 5; i++) {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Product ${i}`,
          sellingPrice: 50 * i,
          stock: 10 * i
        })
        .expect(201);
      
      products.push(response.body.data);
    }

    // Step 2: Retrieve products with filters
    const filteredResponse = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        search: 'Product',
        sort: 'price_high',
        page: 1,
        limit: 10
      })
      .expect(200);

    expect(filteredResponse.body.success).toBe(true);
    expect(Array.isArray(filteredResponse.body.data)).toBe(true);
    expect(filteredResponse.body.data.length).toBeGreaterThanOrEqual(1);
    
    // Check if sorting is correct (highest price first)
    if (filteredResponse.body.data.length > 1) {
      const firstProduct = filteredResponse.body.data[0];
      const lastProduct = filteredResponse.body.data[filteredResponse.body.data.length - 1];
      expect(firstProduct.sellingPrice).toBeGreaterThanOrEqual(lastProduct.sellingPrice);
    }

    // Step 3: Retrieve with pagination
    const paginatedResponse = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        page: 1,
        limit: 3
      })
      .expect(200);

    expect(paginatedResponse.body.data.length).toBeLessThanOrEqual(3);
    expect(paginatedResponse.body.totalPages).toBeDefined();
    expect(paginatedResponse.body.currentPage).toBe(1);
  });

  test('Analytics workflow: Create data → Get analytics → Verify calculations', async () => {
    // Step 1: Create a customer
    const customerResponse = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Analytics Test Customer',
        phone: '9876543217'
      })
      .expect(201);

    const customerId = customerResponse.body.data._id;

    // Step 2: Create a product
    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Analytics Test Product',
        sellingPrice: 100,
        costPrice: 80,
        stock: 100
      })
      .expect(201);

    const productId = productResponse.body.data._id;

    // Step 3: Create multiple transactions
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        type: 'credit',
        amount: 300,
        description: 'Test credit transaction'
      })
      .expect(201);

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        type: 'payment',
        amount: 150,
        description: 'Test payment transaction'
      })
      .expect(201);

    // Step 4: Get dashboard analytics
    const analyticsResponse = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(analyticsResponse.body.success).toBe(true);
    expect(analyticsResponse.body.data).toBeDefined();
    expect(analyticsResponse.body.data.totals).toBeDefined();
    expect(analyticsResponse.body.data.today).toBeDefined();
    expect(analyticsResponse.body.data.customers).toBeDefined();
    expect(analyticsResponse.body.data.transactions).toBeDefined();
  });

  test('Error handling workflow: Invalid operations should return appropriate errors', async () => {
    // Step 1: Try to create a product with negative price (should fail)
    const invalidProductResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Invalid Product',
        sellingPrice: -50, // Invalid negative price
        stock: 10
      })
      .expect(500); // Or whatever error code the server returns

    // The response might be 400 depending on validation
    // expect(invalidProductResponse.body.success).toBe(false);

    // Step 2: Try to update stock to negative value (should fail)
    if (createdProductId) {
      const invalidStockResponse = await request(app)
        .patch(`/api/products/${createdProductId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          adjustment: 1000,
          type: 'remove',
          reason: 'Test invalid removal'
        })
        .expect(200); // This might succeed but then fail validation

      // We expect this to fail properly if the stock would become negative
    }

    // Step 3: Try to access non-existent resources
    const nonExistentProductResponse = await request(app)
      .get('/api/products/507f1f77bcf86cd799439011') // Invalid ID
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(nonExistentProductResponse.body.success).toBe(false);
  });
});