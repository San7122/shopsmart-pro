/**
 * End-to-End Tests - Complete user journey simulation
 * Tests the entire workflow from registration to transaction processing
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../../server/server');
const User = require('../../server/models/User');
const Customer = require('../../server/models/Customer');
const Product = require('../../server/models/Product');
const Transaction = require('../../server/models/Transaction');

describe('End-to-End User Journey Tests', () => {
  let authToken;
  let testUser;
  let customerId;
  let productId;

  beforeAll(async () => {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_e2e_test';
    await mongoose.connect(DB_URI);
  });

  afterAll(async () => {
    // Cleanup all test data
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await Transaction.deleteMany({});
    await mongoose.connection.close();
  });

  // ============================================================
  // COMPLETE REGISTRATION FLOW
  // ============================================================
  describe('Complete Registration Journey', () => {
    test('User can register, login, and access dashboard', async () => {
      // Step 1: Registration
      const registrationData = {
        name: 'E2E Test User',
        phone: '8887776666',
        email: 'e2e@test.com',
        shopName: 'E2E Test Shop',
        password: 'e2epassword123',
        shopType: 'grocery'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.phone).toBe(registrationData.phone);
      expect(registerResponse.body.token).toBeDefined();

      // Step 2: Login with same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          phone: registrationData.phone,
          password: registrationData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      
      authToken = loginResponse.body.token;
      testUser = await User.findOne({ phone: registrationData.phone });

      // Step 3: Access protected dashboard
      const dashboardResponse = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data.totals).toBeDefined();
    });
  });

  // ============================================================
  // COMPLETE CUSTOMER MANAGEMENT FLOW
  // ============================================================
  describe('Complete Customer Management Journey', () => {
    test('User can create, view, update, and delete customers', async () => {
      // Step 1: Create customer
      const customerData = {
        name: 'E2E Customer',
        phone: '8887776667',
        email: 'customer@e2e.com',
        address: '123 Test Street',
        creditLimit: 5000
      };

      const createResponse = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customerData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(customerData.name);
      customerId = createResponse.body.data._id;

      // Step 2: View customer list
      const listResponse = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.length).toBeGreaterThan(0);
      expect(listResponse.body.data.some(c => c._id === customerId)).toBe(true);

      // Step 3: View specific customer
      const viewResponse = await request(app)
        .get(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(viewResponse.body.success).toBe(true);
      expect(viewResponse.body.data._id).toBe(customerId);

      // Step 4: Update customer
      const updateData = {
        name: 'Updated E2E Customer',
        creditLimit: 10000
      };

      const updateResponse = await request(app)
        .put(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe(updateData.name);
      expect(updateResponse.body.data.creditLimit).toBe(updateData.creditLimit);

      // Step 5: Search customers
      const searchResponse = await request(app)
        .get('/api/customers/search?q=E2E')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // Step 6: Delete customer
      const deleteResponse = await request(app)
        .delete(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const verifyDelete = await request(app)
        .get(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(verifyDelete.body.success).toBe(false);
    });
  });

  // ============================================================
  // COMPLETE PRODUCT MANAGEMENT FLOW
  // ============================================================
  describe('Complete Product Management Journey', () => {
    test('User can create, manage, and track product inventory', async () => {
      // Step 1: Create product
      const productData = {
        name: 'E2E Test Product',
        sellingPrice: 150,
        costPrice: 100,
        stock: 100,
        category: 'Electronics',
        barcode: 'E2E001'
      };

      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(productData.name);
      expect(createResponse.body.data.stock).toBe(productData.stock);
      productId = createResponse.body.data._id;

      // Step 2: View product list
      const listResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.length).toBeGreaterThan(0);

      // Step 3: Search products
      const searchResponse = await request(app)
        .get('/api/products/search?q=E2E')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // Step 4: Update stock (add inventory)
      const stockAddResponse = await request(app)
        .patch(`/api/products/${productId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'add',
          adjustment: 50
        })
        .expect(200);

      expect(stockAddResponse.body.success).toBe(true);
      expect(stockAddResponse.body.data.stock).toBe(150); // 100 + 50

      // Step 5: Update stock (remove inventory)
      const stockRemoveResponse = await request(app)
        .patch(`/api/products/${productId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'remove',
          adjustment: 30
        })
        .expect(200);

      expect(stockRemoveResponse.body.success).toBe(true);
      expect(stockRemoveResponse.body.data.stock).toBe(120); // 150 - 30

      // Step 6: Check low stock alerts
      const lowStockResponse = await request(app)
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(lowStockResponse.body.success).toBe(true);
    });
  });

  // ============================================================
  // COMPLETE TRANSACTION FLOW
  // ============================================================
  describe('Complete Transaction Processing Journey', () => {
    test('User can create sale transaction and view reports', async () => {
      // Ensure we have a customer and product
      if (!customerId) {
        const customerResponse = await request(app)
          .post('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Transaction Customer',
            phone: '8887776668'
          })
          .expect(201);
        customerId = customerResponse.body.data._id;
      }

      if (!productId) {
        const productResponse = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Transaction Product',
            sellingPrice: 200,
            costPrice: 150,
            stock: 50
          })
          .expect(201);
        productId = productResponse.body.data._id;
      }

      // Step 1: Create sale transaction
      const transactionData = {
        customer: customerId,
        type: 'sale',
        items: [{
          product: productId,
          quantity: 2,
          price: 200,
          costPrice: 150
        }],
        totalAmount: 400,
        paymentReceived: 400,
        paymentMethod: 'cash',
        notes: 'E2E Test Transaction'
      };

      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(transactionResponse.body.success).toBe(true);
      expect(transactionResponse.body.data.totalAmount).toBe(transactionData.totalAmount);
      expect(transactionResponse.body.data.type).toBe('sale');

      const transactionId = transactionResponse.body.data._id;

      // Step 2: Verify customer balance updated
      const customerResponse = await request(app)
        .get(`/api/customers/${customerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(customerResponse.body.data.balance).toBe(0); // Paid in full

      // Step 3: Verify product stock reduced
      const productResponse = await request(app)
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(productResponse.body.data.stock).toBe(48); // 50 - 2

      // Step 4: View transaction history
      const historyResponse = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);

      // Step 5: View today's transactions
      const todayResponse = await request(app)
        .get('/api/transactions/today')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(todayResponse.body.success).toBe(true);

      // Step 6: Generate sales report
      const reportResponse = await request(app)
        .get('/api/analytics/sales-report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(reportResponse.body.success).toBe(true);
      expect(Array.isArray(reportResponse.body.data)).toBe(true);
    });
  });

  // ============================================================
  // COMPLETE DASHBOARD AND ANALYTICS FLOW
  // ============================================================
  describe('Complete Dashboard and Analytics Journey', () => {
    test('User can access comprehensive dashboard analytics', async () => {
      // Step 1: Get main dashboard
      const dashboardResponse = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data.totals).toBeDefined();
      expect(dashboardResponse.body.data.recentTransactions).toBeDefined();
      expect(dashboardResponse.body.data.topProducts).toBeDefined();

      // Step 2: Get customer insights
      const customerInsightsResponse = await request(app)
        .get('/api/analytics/customer-insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(customerInsightsResponse.body.success).toBe(true);
      expect(customerInsightsResponse.body.data.totalCustomers).toBeDefined();
      expect(customerInsightsResponse.body.data.activeCustomers).toBeDefined();

      // Step 3: Get revenue trends
      const revenueResponse = await request(app)
        .get('/api/analytics/revenue-trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(revenueResponse.body.success).toBe(true);
      expect(Array.isArray(revenueResponse.body.data)).toBe(true);

      // Step 4: Get top selling products
      const topProductsResponse = await request(app)
        .get('/api/analytics/top-products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(topProductsResponse.body.success).toBe(true);
      expect(Array.isArray(topProductsResponse.body.data)).toBe(true);

      // Step 5: Get profit analysis
      const profitResponse = await request(app)
        .get('/api/analytics/profit-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profitResponse.body.success).toBe(true);
      expect(profitResponse.body.data.totalRevenue).toBeDefined();
      expect(profitResponse.body.data.totalProfit).toBeDefined();
    });
  });

  // ============================================================
  // ERROR RECOVERY FLOW
  // ============================================================
  describe('Error Recovery and Edge Cases', () => {
    test('System handles invalid operations gracefully', async () => {
      // Test invalid customer ID
      const invalidCustomerResponse = await request(app)
        .get('/api/customers/invalid123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(invalidCustomerResponse.body.success).toBe(false);

      // Test negative stock update
      if (productId) {
        const negativeStockResponse = await request(app)
          .patch(`/api/products/${productId}/stock`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            type: 'remove',
            adjustment: 1000 // More than available stock
          })
          .expect(500); // Should fail gracefully

        expect(negativeStockResponse.body.success).toBe(false);
      }

      // Test duplicate customer creation
      const duplicateCustomerResponse = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Duplicate Customer',
          phone: '8887776667' // Same as existing customer
        })
        .expect(400);

      expect(duplicateCustomerResponse.body.success).toBe(false);
    });
  });

  // ============================================================
  // CONCURRENT USER OPERATIONS
  // ============================================================
  describe('Concurrent Operations Test', () => {
    test('Multiple simultaneous operations work correctly', async () => {
      // Create multiple customers concurrently
      const customerPromises = [];
      for (let i = 1; i <= 3; i++) {
        customerPromises.push(
          request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Concurrent Customer ${i}`,
              phone: `888777667${i}`
            })
            .expect(201)
        );
      }

      const customerResponses = await Promise.all(customerPromises);
      customerResponses.forEach(response => {
        expect(response.body.success).toBe(true);
      });

      // Create multiple products concurrently
      const productPromises = [];
      for (let i = 1; i <= 3; i++) {
        productPromises.push(
          request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Concurrent Product ${i}`,
              sellingPrice: 100 + i * 10,
              stock: 50
            })
            .expect(201)
        );
      }

      const productResponses = await Promise.all(productPromises);
      productResponses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });
  });
});