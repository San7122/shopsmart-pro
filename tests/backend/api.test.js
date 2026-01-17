// Backend Test Suite using Jest and Supertest
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server/server');
const User = require('../../server/models/User');
const Customer = require('../../server/models/Customer');
const Product = require('../../server/models/Product');
const Transaction = require('../../server/models/Transaction');

// Test user data
const testUser = {
  name: 'Test Shopkeeper',
  phone: '9876543210',
  password: 'test123456',
  shopName: 'Test Kirana Store',
  shopType: 'kirana'
};

let authToken;
let testUserId;
let testCustomerId;
let testProductId;

// Setup and teardown
beforeAll(async () => {
  // Connect to test database
  const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/shopsmart-test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Clean up test data
  await User.deleteMany({ phone: testUser.phone });
  await mongoose.connection.close();
});

// ============== AUTH TESTS ==============
describe('Auth Endpoints', () => {
  
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.name).toBe(testUser.name);
      
      authToken = res.body.token;
      testUserId = res.body.data._id;
    });
    
    it('should not register with existing phone', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
    
    it('should not register without required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test' });
      
      expect(res.statusCode).toBe(400);
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: testUser.password
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      
      authToken = res.body.token;
    });
    
    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: 'wrongpassword'
        });
      
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should get current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.phone).toBe(testUser.phone);
    });
    
    it('should fail without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');
      
      expect(res.statusCode).toBe(401);
    });
  });
});

// ============== CUSTOMER TESTS ==============
describe('Customer Endpoints', () => {
  const testCustomer = {
    name: 'Test Customer',
    phone: '9876543211',
    address: 'Test Address'
  };
  
  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testCustomer);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testCustomer.name);
      
      testCustomerId = res.body.data._id;
    });
    
    it('should not create customer without name', async () => {
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phone: '1234567890' });
      
      expect(res.statusCode).toBe(400);
    });
  });
  
  describe('GET /api/customers', () => {
    it('should get all customers', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    
    it('should search customers by name', async () => {
      const res = await request(app)
        .get('/api/customers?search=Test')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/customers/:id', () => {
    it('should get single customer', async () => {
      const res = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(testCustomerId);
    });
    
    it('should return 404 for non-existent customer', async () => {
      const res = await request(app)
        .get('/api/customers/000000000000000000000000')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(404);
    });
  });
});

// ============== TRANSACTION TESTS ==============
describe('Transaction Endpoints', () => {
  
  describe('POST /api/transactions', () => {
    it('should create credit transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomerId,
          type: 'credit',
          amount: 1000,
          description: 'Test credit'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(1000);
      expect(res.body.data.type).toBe('credit');
    });
    
    it('should create payment transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: testCustomerId,
          type: 'payment',
          amount: 500,
          paymentMethod: 'cash'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.type).toBe('payment');
    });
    
    it('should update customer balance', async () => {
      const res = await request(app)
        .get(`/api/customers/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.body.data.balance).toBe(500); // 1000 credit - 500 payment
    });
  });
  
  describe('GET /api/transactions', () => {
    it('should get all transactions', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
    
    it('should filter by type', async () => {
      const res = await request(app)
        .get('/api/transactions?type=credit')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      res.body.data.forEach(txn => {
        expect(txn.type).toBe('credit');
      });
    });
  });
});

// ============== PRODUCT TESTS ==============
describe('Product Endpoints', () => {
  const testProduct = {
    name: 'Test Product',
    brand: 'Test Brand',
    sellingPrice: 100,
    costPrice: 80,
    stock: 50,
    unit: 'pcs'
  };
  
  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testProduct);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testProduct.name);
      
      testProductId = res.body.data._id;
    });
  });
  
  describe('GET /api/products', () => {
    it('should get all products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
  
  describe('PATCH /api/products/:id/stock', () => {
    it('should update stock (add)', async () => {
      const res = await request(app)
        .patch(`/api/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          adjustment: 10,
          type: 'add'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.stock).toBe(60); // 50 + 10
    });
    
    it('should update stock (remove)', async () => {
      const res = await request(app)
        .patch(`/api/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          adjustment: 5,
          type: 'remove'
        });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.stock).toBe(55); // 60 - 5
    });
  });
});

// ============== ANALYTICS TESTS ==============
describe('Analytics Endpoints', () => {
  
  describe('GET /api/analytics/dashboard', () => {
    it('should get dashboard data', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('today');
      expect(res.body.data).toHaveProperty('receivables');
    });
  });
});

// ============== HEALTH CHECK ==============
describe('Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
