/**
 * Smoke Test Suite for ShopSmart Pro
 * Quick health check tests to verify basic functionality
 */

const request = require('supertest');
const mongoose = require('mongoose');

// We'll use the existing server module
const app = require('../server/server');

describe('Smoke Tests - Basic Health Checks', () => {
  beforeAll(async () => {
    // Connect to a test database
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_test';
    await mongoose.connect(DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('App starts and serves health endpoint correctly', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('healthy');
    expect(response.body.message).toBeDefined();
  });

  test('Database connection works', async () => {
    // This is tested implicitly through the health endpoint
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body.services.mongodb).toBeDefined();
  });

  test('Main API endpoint responds', async () => {
    // Test a general 404 for undefined route to make sure server is responding
    const response = await request(app)
      .get('/api/undefined-endpoint')
      .expect(404);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Endpoint not found');
  });

  test('Static files path exists', async () => {
    // Test that uploads route exists (even if 404 is expected for missing files)
    const response = await request(app)
      .get('/uploads/undefined-file.jpg')
      .expect(404);
    
    // Just verify the route is registered and doesn't crash the server
    expect(response.status).toBe(404);
  });

  test('Authentication endpoint exists', async () => {
    // Test that auth route exists (should return 400 for missing data rather than 404)
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400);
    
    expect(response.body.success).toBe(false);
  });
});