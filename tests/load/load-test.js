/**
 * ShopSmart Pro - Load Testing with k6
 * Run: k6 run tests/load/load-test.js
 * 
 * Installation: 
 * - Mac: brew install k6
 * - Windows: choco install k6
 * - Linux: sudo apt install k6
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const dashboardDuration = new Trend('dashboard_duration');
const customerListDuration = new Trend('customer_list_duration');
const transactionDuration = new Trend('transaction_duration');

// Test configuration
export const options = {
  // Load test stages
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users over 1 minute
    { duration: '3m', target: 50 },   // Ramp up to 50 users over 3 minutes
    { duration: '5m', target: 100 },  // Ramp up to 100 users over 5 minutes
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 50 },   // Ramp down to 50 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  
  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],      // Less than 1% failure rate
    errors: ['rate<0.05'],               // Less than 5% custom errors
    login_duration: ['avg<300'],         // Login under 300ms average
    dashboard_duration: ['avg<400'],     // Dashboard under 400ms average
    customer_list_duration: ['avg<300'], // Customer list under 300ms
    transaction_duration: ['avg<500'],   // Transaction under 500ms
  },
};

// Test configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

// Test users pool
const TEST_USERS = [
  { phone: '9000000001', password: 'Test@123456' },
  { phone: '9000000002', password: 'Test@123456' },
  { phone: '9000000003', password: 'Test@123456' },
  { phone: '9000000004', password: 'Test@123456' },
  { phone: '9000000005', password: 'Test@123456' },
];

// Setup function - runs once before test
export function setup() {
  // Create test users if they don't exist
  const users = [];
  
  TEST_USERS.forEach((user, index) => {
    const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      name: `Load Test User ${index + 1}`,
      phone: user.phone,
      password: user.password,
      shopName: `Test Shop ${index + 1}`,
      shopType: 'kirana'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (registerRes.status === 201 || registerRes.status === 400) {
      // User created or already exists
      const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        phone: user.phone,
        password: user.password
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (loginRes.status === 200) {
        const body = JSON.parse(loginRes.body);
        users.push({
          ...user,
          token: body.token,
          userId: body.user._id
        });
      }
    }
  });
  
  return { users };
}

// Main test function
export default function(data) {
  const users = data.users;
  if (!users || users.length === 0) {
    console.error('No test users available');
    return;
  }
  
  // Pick a random user
  const user = users[Math.floor(Math.random() * users.length)];
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`
  };
  
  // ============================================================
  // Test Scenarios
  // ============================================================
  
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(res.status !== 200);
  });
  
  sleep(1);
  
  group('Login', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      phone: user.phone,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    loginDuration.add(Date.now() - start);
    
    check(res, {
      'login status 200': (r) => r.status === 200,
      'login has token': (r) => JSON.parse(r.body).token !== undefined,
    });
    errorRate.add(res.status !== 200);
  });
  
  sleep(1);
  
  group('Dashboard', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/analytics/dashboard`, {
      headers: authHeaders
    });
    dashboardDuration.add(Date.now() - start);
    
    check(res, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard has data': (r) => JSON.parse(r.body).success === true,
    });
    errorRate.add(res.status !== 200);
  });
  
  sleep(1);
  
  group('Customer Operations', () => {
    // List customers
    const start = Date.now();
    const listRes = http.get(`${BASE_URL}/customers`, {
      headers: authHeaders
    });
    customerListDuration.add(Date.now() - start);
    
    check(listRes, {
      'customer list status 200': (r) => r.status === 200,
    });
    errorRate.add(listRes.status !== 200);
    
    // Create customer (occasional)
    if (Math.random() < 0.1) {
      const createRes = http.post(`${BASE_URL}/customers`, JSON.stringify({
        name: `Load Test Customer ${Date.now()}`,
        phone: `7${Math.floor(Math.random() * 1000000000)}`,
        address: 'Test Address'
      }), {
        headers: authHeaders
      });
      
      check(createRes, {
        'customer create status 201': (r) => r.status === 201,
      });
    }
  });
  
  sleep(1);
  
  group('Product Operations', () => {
    // List products
    const res = http.get(`${BASE_URL}/products`, {
      headers: authHeaders
    });
    
    check(res, {
      'product list status 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });
  
  sleep(1);
  
  group('Transaction Operations', () => {
    // List transactions
    const listRes = http.get(`${BASE_URL}/transactions`, {
      headers: authHeaders
    });
    
    check(listRes, {
      'transaction list status 200': (r) => r.status === 200,
    });
    
    // Get customers for transaction
    const customerRes = http.get(`${BASE_URL}/customers?limit=1`, {
      headers: authHeaders
    });
    
    if (customerRes.status === 200) {
      const customers = JSON.parse(customerRes.body).data;
      
      if (customers && customers.length > 0 && Math.random() < 0.2) {
        // Create transaction (20% of requests)
        const start = Date.now();
        const createRes = http.post(`${BASE_URL}/transactions`, JSON.stringify({
          customer: customers[0]._id,
          type: Math.random() < 0.7 ? 'credit' : 'payment',
          amount: Math.floor(Math.random() * 500) + 50,
          description: 'Load test transaction'
        }), {
          headers: authHeaders
        });
        transactionDuration.add(Date.now() - start);
        
        check(createRes, {
          'transaction create status 201': (r) => r.status === 201,
        });
        errorRate.add(createRes.status !== 201);
      }
    }
  });
  
  sleep(2);
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total users tested: ${data.users?.length || 0}`);
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/summary.json': JSON.stringify(data),
    'tests/load/results/summary.html': htmlReport(data),
  };
}

// Text summary formatter
function textSummary(data, options) {
  const { metrics } = data;
  
  return `
╔═══════════════════════════════════════════════════════════════╗
║                    LOAD TEST RESULTS                          ║
╠═══════════════════════════════════════════════════════════════╣
║ Total Requests:    ${metrics.http_reqs?.values?.count || 0}
║ Failed Requests:   ${metrics.http_req_failed?.values?.passes || 0}
║ Error Rate:        ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
║                                                               ║
║ Response Times (p95):                                         ║
║ - Overall:         ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) || 0}ms
║ - Login:           ${metrics.login_duration?.values?.avg?.toFixed(0) || 0}ms (avg)
║ - Dashboard:       ${metrics.dashboard_duration?.values?.avg?.toFixed(0) || 0}ms (avg)
║ - Customer List:   ${metrics.customer_list_duration?.values?.avg?.toFixed(0) || 0}ms (avg)
║ - Transaction:     ${metrics.transaction_duration?.values?.avg?.toFixed(0) || 0}ms (avg)
║                                                               ║
║ Virtual Users:     ${metrics.vus?.values?.max || 0} (max)
║ Test Duration:     ${(data.state?.testRunDurationMs / 1000 / 60).toFixed(1) || 0} minutes
╚═══════════════════════════════════════════════════════════════╝
  `;
}

// HTML report generator
function htmlReport(data) {
  const { metrics } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>ShopSmart Pro - Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #7C3AED; }
    .metric { display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid #eee; }
    .metric:last-child { border-bottom: none; }
    .metric-name { font-weight: 600; }
    .metric-value { color: #6b7280; }
    .pass { color: #10b981; }
    .fail { color: #ef4444; }
    .section { margin: 20px 0; }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 ShopSmart Pro - Load Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="section">
      <div class="section-title">📊 Summary</div>
      <div class="metric">
        <span class="metric-name">Total Requests</span>
        <span class="metric-value">${metrics.http_reqs?.values?.count || 0}</span>
      </div>
      <div class="metric">
        <span class="metric-name">Failed Requests</span>
        <span class="metric-value">${metrics.http_req_failed?.values?.passes || 0}</span>
      </div>
      <div class="metric">
        <span class="metric-name">Error Rate</span>
        <span class="metric-value ${(metrics.errors?.values?.rate || 0) < 0.05 ? 'pass' : 'fail'}">
          ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
        </span>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">⏱️ Response Times</div>
      <div class="metric">
        <span class="metric-name">Average</span>
        <span class="metric-value">${metrics.http_req_duration?.values?.avg?.toFixed(0) || 0}ms</span>
      </div>
      <div class="metric">
        <span class="metric-name">95th Percentile</span>
        <span class="metric-value ${metrics.http_req_duration?.values?.['p(95)'] < 500 ? 'pass' : 'fail'}">
          ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) || 0}ms
        </span>
      </div>
      <div class="metric">
        <span class="metric-name">99th Percentile</span>
        <span class="metric-value">${metrics.http_req_duration?.values?.['p(99)']?.toFixed(0) || 0}ms</span>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">👥 Virtual Users</div>
      <div class="metric">
        <span class="metric-name">Max Concurrent</span>
        <span class="metric-value">${metrics.vus?.values?.max || 0}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
