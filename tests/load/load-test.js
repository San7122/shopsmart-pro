/**
 * Load and Performance Testing
 * Tests application behavior under stress and concurrent load
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../../server/server');
const User = require('../../server/models/User');
const Customer = require('../../server/models/Customer');
const Product = require('../../server/models/Product');

describe('Load and Performance Tests', () => {
  let authToken;
  let testUser;
  let baseCustomers = [];
  let baseProducts = [];

  beforeAll(async () => {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_load_test';
    await mongoose.connect(DB_URI);

    // Setup test user
    testUser = await User.create({
      name: 'Load Test User',
      phone: '7776665555',
      shopName: 'Load Test Shop',
      password: 'loadtest123',
      email: 'load@test.com'
    });

    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );

    // Pre-populate with base data for realistic testing
    for (let i = 1; i <= 50; i++) {
      const customer = await Customer.create({
        user: testUser._id,
        name: `Load Customer ${i}`,
        phone: `77766655${String(i).padStart(2, '0')}`,
        email: `customer${i}@load.com`
      });
      baseCustomers.push(customer._id);
    }

    for (let i = 1; i <= 100; i++) {
      const product = await Product.create({
        user: testUser._id,
        name: `Load Product ${i}`,
        sellingPrice: 50 + (i % 100),
        costPrice: 30 + (i % 80),
        stock: 20 + (i % 200),
        category: `Category ${(i % 5) + 1}`
      });
      baseProducts.push(product._id);
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await mongoose.connection.close();
  });

  // ============================================================
  // CONCURRENCY TESTS
  // ============================================================
  describe('Concurrency Tests', () => {
    test('Handles 20 concurrent customer creations', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 1; i <= 20; i++) {
        promises.push(
          request(app)
            .post('/api/customers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Concurrent Customer ${Date.now()}-${i}`,
              phone: `77766656${String(i).padStart(2, '0')}`,
              email: `concurrent${i}@load.com`
            })
            .expect(201)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });

      const duration = endTime - startTime;
      console.log(`⏱️ 20 concurrent customer creations took ${duration}ms`);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('Handles 30 concurrent product queries', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 30; i++) {
        promises.push(
          request(app)
            .get('/api/products')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      const duration = endTime - startTime;
      console.log(`⏱️ 30 concurrent product queries took ${duration}ms`);
      expect(duration).toBeLessThan(3000); // 3 seconds
    });
  });

  // ============================================================
  // STRESS TESTS
  // ============================================================
  describe('Stress Tests', () => {
    test('Handles rapid sequential requests', async () => {
      const startTime = Date.now();
      let successCount = 0;

      // Make 50 rapid requests
      for (let i = 1; i <= 50; i++) {
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        if (response.body.success) {
          successCount++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ 50 sequential customer queries took ${duration}ms (${successCount}/50 successful)`);
      
      // Most requests should succeed
      expect(successCount).toBeGreaterThan(45);
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    test('Handles database-intensive operations', async () => {
      const startTime = Date.now();
      
      // Complex query with search, filtering, and sorting
      const response = await request(app)
        .get('/api/products/search?q=Load&sort=price&order=asc&limit=50')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      console.log(`⏱️ Complex product search took ${duration}ms`);
      expect(duration).toBeLessThan(2000); // 2 seconds
    });
  });

  // ============================================================
  // PERFORMANCE BENCHMARKS
  // ============================================================
  describe('Performance Benchmarks', () => {
    test('API Response Time Benchmarks', async () => {
      // Test health endpoint performance
      const healthStart = Date.now();
      await request(app).get('/api/health').expect(200);
      const healthTime = Date.now() - healthStart;
      
      console.log(`📈 Health endpoint: ${healthTime}ms`);
      expect(healthTime).toBeLessThan(100);

      // Test authentication endpoint performance
      const authStart = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({ phone: '7776665555', password: 'loadtest123' })
        .expect(200);
      const authTime = Date.now() - authStart;
      
      console.log(`📈 Auth endpoint: ${authTime}ms`);
      expect(authTime).toBeLessThan(500);

      // Test customer list endpoint performance
      const customerStart = Date.now();
      await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const customerTime = Date.now() - customerStart;
      
      console.log(`📈 Customer list: ${customerTime}ms`);
      expect(customerTime).toBeLessThan(1000);

      // Test product list endpoint performance
      const productStart = Date.now();
      await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const productTime = Date.now() - productStart;
      
      console.log(`📈 Product list: ${productTime}ms`);
      expect(productTime).toBeLessThan(1000);
    });

    test('Database Query Performance', async () => {
      // Test simple customer lookup
      const customerLookupStart = Date.now();
      const customer = await Customer.findById(baseCustomers[0]);
      const customerLookupTime = Date.now() - customerLookupStart;
      
      console.log(`📈 Customer lookup: ${customerLookupTime}ms`);
      expect(customerLookupTime).toBeLessThan(50);

      // Test product aggregation query
      const aggStart = Date.now();
      const lowStockProducts = await Product.find({
        user: testUser._id,
        stock: { $lt: 50 }
      }).limit(10);
      const aggTime = Date.now() - aggStart;
      
      console.log(`📈 Low stock query: ${aggTime}ms (${lowStockProducts.length} results)`);
      expect(aggTime).toBeLessThan(200);
    });
  });

  // ============================================================
  // MEMORY USAGE TESTS
  // ============================================================
  describe('Memory Usage Tests', () => {
    test('Monitors memory consumption during operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform several operations
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`💾 Initial memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`💾 Final memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`💾 Memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);

      // Memory should not grow excessively
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });

  // ============================================================
  // SCALABILITY TESTS
  // ============================================================
  describe('Scalability Tests', () => {
    test('Handles increasing load gracefully', async () => {
      const loadLevels = [5, 10, 20, 30];
      const results = [];

      for (const loadLevel of loadLevels) {
        const startTime = Date.now();
        const promises = [];

        for (let i = 0; i < loadLevel; i++) {
          promises.push(
            request(app)
              .get('/api/health')
              .expect(200)
          );
        }

        await Promise.all(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;
        const avgResponseTime = duration / loadLevel;

        results.push({
          load: loadLevel,
          totalDuration: duration,
          avgResponseTime: avgResponseTime
        });

        console.log(`📊 Load ${loadLevel}: ${avgResponseTime.toFixed(2)}ms avg response time`);
        
        // Response times should remain reasonable even under load
        expect(avgResponseTime).toBeLessThan(200);
      }

      // Log results summary
      console.log('\n📈 Load Test Summary:');
      results.forEach(result => {
        console.log(`  ${result.load} concurrent requests: ${result.avgResponseTime.toFixed(2)}ms avg`);
      });
    });
  });

  // ============================================================
  // ERROR HANDLING UNDER LOAD
  // ============================================================
  describe('Error Handling Under Load', () => {
    test('Gracefully handles errors during high concurrency', async () => {
      const promises = [];

      // Mix of valid and invalid requests
      for (let i = 0; i < 25; i++) {
        if (i % 5 === 0) {
          // Invalid request (missing auth)
          promises.push(
            request(app)
              .post('/api/customers')
              .send({ name: `Test Customer ${i}` })
              .expect(401)
          );
        } else {
          // Valid request
          promises.push(
            request(app)
              .get('/api/customers')
              .set('Authorization', `Bearer ${authToken}`)
              .expect(200)
          );
        }
      }

      const responses = await Promise.all(promises);
      
      // Count successes and failures
      const successCount = responses.filter(r => r.status === 200).length;
      const errorCount = responses.filter(r => r.status === 401).length;
      
      console.log(`✅ Successful requests: ${successCount}`);
      console.log(`❌ Error requests: ${errorCount}`);
      
      // System should handle mixed load without crashing
      expect(successCount + errorCount).toBe(25);
    });
  });
});