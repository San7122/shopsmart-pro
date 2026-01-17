/**
 * Unit Tests for ShopSmart Pro
 * Tests for individual functions and business logic
 */

const mongoose = require('mongoose');
const User = require('../server/models/User');
const Product = require('../server/models/Product');
const Customer = require('../server/models/Customer');
const Transaction = require('../server/models/Transaction');

// Mock request and response objects for controller testing
const createMockReq = (overrides = {}) => ({
  user: { id: 'mockUserId' },
  params: {},
  query: {},
  body: {},
  ...overrides
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('Unit Tests - Model Validations and Business Logic', () => {
  beforeAll(async () => {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_test_unit';
    await mongoose.connect(DB_URI, { useNewUrlParser: true });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await User.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Transaction.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('User Model Tests', () => {
    test('should create a valid user', async () => {
      const userData = {
        name: 'Test User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.phone).toBe(userData.phone);
      expect(savedUser.shopName).toBe(userData.shopName);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
    });

    test('should fail to create user without required fields', async () => {
      const user = new User({});
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.phone).toBeDefined();
      expect(error.errors.shopName).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    test('should validate phone number format', async () => {
      const userData = {
        name: 'Test User',
        phone: 'invalid-phone',
        shopName: 'Test Shop',
        password: 'password123'
      };

      const user = new User(userData);
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
    });

    test('should validate password length', async () => {
      const userData = {
        name: 'Test User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: '123' // Too short
      };

      const user = new User(userData);
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });
  });

  describe('Product Model Tests', () => {
    test('should create a valid product', async () => {
      const productData = {
        user: 'mockUserId',
        name: 'Test Product',
        sellingPrice: 100,
        stock: 10
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name).toBe(productData.name);
      expect(savedProduct.sellingPrice).toBe(productData.sellingPrice);
      expect(savedProduct.stock).toBe(productData.stock);
    });

    test('should fail to create product without required fields', async () => {
      const product = new Product({});
      let error;
      try {
        await product.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.user).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.sellingPrice).toBeDefined();
    });

    test('should validate selling price is positive', async () => {
      const productData = {
        user: 'mockUserId',
        name: 'Test Product',
        sellingPrice: -10, // Invalid negative price
        stock: 10
      };

      const product = new Product(productData);
      let error;
      try {
        await product.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.sellingPrice).toBeDefined();
    });

    test('should calculate profit margin virtual property', async () => {
      const productData = {
        user: 'mockUserId',
        name: 'Test Product',
        costPrice: 80,
        sellingPrice: 100,
        stock: 10
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      // Profit margin = ((sellingPrice - costPrice) / sellingPrice) * 100
      // = ((100 - 80) / 100) * 100 = 20%
      expect(savedProduct.profitMargin).toBe('20.00');
    });
  });

  describe('Customer Model Tests', () => {
    test('should create a valid customer', async () => {
      const customerData = {
        user: 'mockUserId',
        name: 'Test Customer',
        balance: 0
      };

      const customer = new Customer(customerData);
      const savedCustomer = await customer.save();

      expect(savedCustomer._id).toBeDefined();
      expect(savedCustomer.name).toBe(customerData.name);
      expect(savedCustomer.balance).toBe(customerData.balance);
    });

    test('should fail to create customer without required fields', async () => {
      const customer = new Customer({});
      let error;
      try {
        await customer.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.user).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });
  });

  describe('Transaction Model Tests', () => {
    test('should create a valid transaction', async () => {
      const transactionData = {
        user: 'mockUserId',
        customer: 'mockCustomerId',
        type: 'credit',
        amount: 100,
        balanceAfter: 100
      };

      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      expect(savedTransaction._id).toBeDefined();
      expect(savedTransaction.type).toBe(transactionData.type);
      expect(savedTransaction.amount).toBe(transactionData.amount);
      expect(savedTransaction.balanceAfter).toBe(transactionData.balanceAfter);
    });

    test('should fail to create transaction without required fields', async () => {
      const transaction = new Transaction({});
      let error;
      try {
        await transaction.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.user).toBeDefined();
      expect(error.errors.customer).toBeDefined();
      expect(error.errors.type).toBeDefined();
      expect(error.errors.amount).toBeDefined();
      expect(error.errors.balanceAfter).toBeDefined();
    });

    test('should validate transaction amount is positive', async () => {
      const transactionData = {
        user: 'mockUserId',
        customer: 'mockCustomerId',
        type: 'credit',
        amount: -50, // Invalid negative amount
        balanceAfter: -50
      };

      const transaction = new Transaction(transactionData);
      let error;
      try {
        await transaction.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.amount).toBeDefined();
    });
  });
});

describe('Unit Tests - Controller Functions', () => {
  beforeAll(async () => {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_test_controller';
    await mongoose.connect(DB_URI, { useNewUrlParser: true });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await User.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Transaction.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Product Controller Functions', () => {
    test('updateStock function should correctly calculate previous stock', async () => {
      // Import the controller function
      const productController = require('../server/controllers/productController');

      // Create a user and product first
      const user = await User.create({
        name: 'Test User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const product = await Product.create({
        user: user._id,
        name: 'Test Product',
        sellingPrice: 100,
        stock: 20,
        lowStockAlert: 5
      });

      // Mock request and response
      const req = createMockReq({
        params: { id: product._id.toString() },
        body: { 
          adjustment: 10,
          type: 'add',
          reason: 'restock'
        },
        user: { id: user._id }
      });

      const res = createMockRes();

      // Call the updateStock function
      await productController.updateStock(req, res);

      // Verify the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.currentStock).toBe(30); // 20 + 10
    });

    test('updateStock function should handle "set" type correctly', async () => {
      const productController = require('../server/controllers/productController');

      // Create a user and product first
      const user = await User.create({
        name: 'Test User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const product = await Product.create({
        user: user._id,
        name: 'Test Product',
        sellingPrice: 100,
        stock: 20,
        lowStockAlert: 5
      });

      // Mock request and response
      const req = createMockReq({
        params: { id: product._id.toString() },
        body: { 
          adjustment: 50, // New stock value when type is 'set'
          type: 'set',
          reason: 'physical count'
        },
        user: { id: user._id }
      });

      const res = createMockRes();

      // Call the updateStock function
      await productController.updateStock(req, res);

      // Verify the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.currentStock).toBe(50); // Set to 50
    });
  });
});