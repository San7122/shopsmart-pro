/**
 * Database Tests for ShopSmart Pro
 * Tests for Create, Read, Update, Delete operations and data validation
 */

const mongoose = require('mongoose');
const User = require('../server/models/User');
const Customer = require('../server/models/Customer');
const Product = require('../server/models/Product');
const Transaction = require('../server/models/Transaction');
const Category = require('../server/models/Category');

describe('Database Tests', () => {
  beforeAll(async () => {
    const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart_test_db';
    await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  beforeEach(async () => {
    // Clean up all collections before each test
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await Transaction.deleteMany({});
    await Category.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // CREATE OPERATIONS TESTS
  describe('Create Operations', () => {
    test('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123',
        email: 'test@example.com'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.phone).toBe(userData.phone);
      expect(savedUser.shopName).toBe(userData.shopName);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    test('should create a new customer', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customerData = {
        user: user._id,
        name: 'Test Customer',
        phone: '9876543215',
        balance: 0
      };

      const customer = new Customer(customerData);
      const savedCustomer = await customer.save();

      expect(savedCustomer._id).toBeDefined();
      expect(savedCustomer.name).toBe(customerData.name);
      expect(savedCustomer.phone).toBe(customerData.phone);
      expect(savedCustomer.balance).toBe(customerData.balance);
      expect(savedCustomer.user.toString()).toBe(user._id.toString());
    });

    test('should create a new product', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const productData = {
        user: user._id,
        name: 'Test Product',
        sellingPrice: 100,
        stock: 10,
        lowStockAlert: 5
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name).toBe(productData.name);
      expect(savedProduct.sellingPrice).toBe(productData.sellingPrice);
      expect(savedProduct.stock).toBe(productData.stock);
      expect(savedProduct.user.toString()).toBe(user._id.toString());
    });

    test('should create a new transaction', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Test Customer',
        phone: '9876543215'
      });

      const transactionData = {
        user: user._id,
        customer: customer._id,
        type: 'credit',
        amount: 250,
        balanceAfter: 250
      };

      const transaction = new Transaction(transactionData);
      const savedTransaction = await transaction.save();

      expect(savedTransaction._id).toBeDefined();
      expect(savedTransaction.type).toBe(transactionData.type);
      expect(savedTransaction.amount).toBe(transactionData.amount);
      expect(savedTransaction.balanceAfter).toBe(transactionData.balanceAfter);
      expect(savedTransaction.user.toString()).toBe(user._id.toString());
      expect(savedTransaction.customer.toString()).toBe(customer._id.toString());
    });
  });

  // READ OPERATIONS TESTS
  describe('Read Operations', () => {
    test('should find user by ID', async () => {
      const user = await User.create({
        name: 'Find User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const foundUser = await User.findById(user._id);
      expect(foundUser).toBeDefined();
      expect(foundUser._id.toString()).toBe(user._id.toString());
      expect(foundUser.name).toBe('Find User');
    });

    test('should find customer by ID', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Find Customer',
        phone: '9876543215'
      });

      const foundCustomer = await Customer.findById(customer._id);
      expect(foundCustomer).toBeDefined();
      expect(foundCustomer._id.toString()).toBe(customer._id.toString());
      expect(foundCustomer.name).toBe('Find Customer');
    });

    test('should find multiple products by user', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const products = [
        { user: user._id, name: 'Product 1', sellingPrice: 100, stock: 10 },
        { user: user._id, name: 'Product 2', sellingPrice: 200, stock: 20 },
        { user: user._id, name: 'Product 3', sellingPrice: 300, stock: 30 }
      ];

      await Product.insertMany(products);

      const foundProducts = await Product.find({ user: user._id });
      expect(foundProducts).toHaveLength(3);
      expect(foundProducts[0].name).toBe('Product 1');
      expect(foundProducts[1].name).toBe('Product 2');
      expect(foundProducts[2].name).toBe('Product 3');
    });

    test('should populate related data', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Populate Test Customer',
        phone: '9876543215'
      });

      const transaction = await Transaction.create({
        user: user._id,
        customer: customer._id,
        type: 'credit',
        amount: 150,
        balanceAfter: 150
      });

      const populatedTransaction = await Transaction.findById(transaction._id)
        .populate('customer', 'name phone')
        .populate('user', 'name shopName');

      expect(populatedTransaction.customer.name).toBe('Populate Test Customer');
      expect(populatedTransaction.customer.phone).toBe('9876543215');
      expect(populatedTransaction.user.name).toBe('Shop Owner');
    });

    test('should search with text index', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      await Customer.create({
        user: user._id,
        name: 'John Smith',
        phone: '9876543215'
      });

      await Customer.create({
        user: user._id,
        name: 'Jane Doe',
        phone: '9876543216'
      });

      // Test search functionality (would use text index in real implementation)
      const searchResults = await Customer.find({ user: user._id, name: { $regex: 'John', $options: 'i' } });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toContain('John');
    });
  });

  // UPDATE OPERATIONS TESTS
  describe('Update Operations', () => {
    test('should update user information', async () => {
      const user = await User.create({
        name: 'Original Name',
        phone: '9876543210',
        shopName: 'Original Shop',
        password: 'password123'
      });

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { name: 'Updated Name', shopName: 'Updated Shop' },
        { new: true, runValidators: true }
      );

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.shopName).toBe('Updated Shop');
      expect(updatedUser.phone).toBe('9876543210'); // Should remain unchanged
    });

    test('should update customer information', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Original Customer',
        phone: '9876543215',
        balance: 0
      });

      const updatedCustomer = await Customer.findByIdAndUpdate(
        customer._id,
        { name: 'Updated Customer', email: 'updated@example.com' },
        { new: true, runValidators: true }
      );

      expect(updatedCustomer.name).toBe('Updated Customer');
      expect(updatedCustomer.email).toBe('updated@example.com');
      expect(updatedCustomer.phone).toBe('9876543215'); // Should remain unchanged
    });

    test('should update product stock', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const product = await Product.create({
        user: user._id,
        name: 'Stock Test Product',
        sellingPrice: 100,
        stock: 10
      });

      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        { stock: 25 },
        { new: true, runValidators: true }
      );

      expect(updatedProduct.stock).toBe(25);
    });

    test('should update transaction', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Test Customer',
        phone: '9876543215'
      });

      const transaction = await Transaction.create({
        user: user._id,
        customer: customer._id,
        type: 'credit',
        amount: 100,
        balanceAfter: 100
      });

      const updatedTransaction = await Transaction.findByIdAndUpdate(
        transaction._id,
        { description: 'Updated transaction description' },
        { new: true, runValidators: true }
      );

      expect(updatedTransaction.description).toBe('Updated transaction description');
    });
  });

  // DELETE OPERATIONS TESTS
  describe('Delete Operations', () => {
    test('should soft delete a product', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const product = await Product.create({
        user: user._id,
        name: 'Product to Delete',
        sellingPrice: 100,
        stock: 10
      });

      // Soft delete by setting isActive to false
      await Product.findByIdAndUpdate(
        product._id,
        { isActive: false },
        { runValidators: true }
      );

      const foundProduct = await Product.findById(product._id);
      expect(foundProduct.isActive).toBe(false);

      // Verify it's not returned in normal queries
      const activeProducts = await Product.find({ user: user._id, isActive: true });
      expect(activeProducts).toHaveLength(0);
    });

    test('should delete a customer and verify cascade effects', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Customer to Delete',
        phone: '9876543215'
      });

      // In this system, deleting a customer may set isActive to false rather than hard delete
      await Customer.findByIdAndUpdate(
        customer._id,
        { isActive: false },
        { runValidators: true }
      );

      const foundCustomer = await Customer.findById(customer._id);
      expect(foundCustomer.isActive).toBe(false);
    });

    test('should hard delete a transaction (logical delete in this system)', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Test Customer',
        phone: '9876543215'
      });

      const transaction = await Transaction.create({
        user: user._id,
        customer: customer._id,
        type: 'credit',
        amount: 100,
        balanceAfter: 100
      });

      // Mark as deleted rather than hard delete
      await Transaction.findByIdAndUpdate(
        transaction._id,
        { isDeleted: true, deletedReason: 'User requested deletion' },
        { runValidators: true }
      );

      const foundTransaction = await Transaction.findById(transaction._id);
      expect(foundTransaction.isDeleted).toBe(true);
      expect(foundTransaction.deletedReason).toBe('User requested deletion');
    });
  });

  // INVALID DATA REJECTION TESTS
  describe('Invalid Data Rejection', () => {
    test('should reject user with invalid phone format', async () => {
      const userData = {
        name: 'Test User',
        phone: 'invalid-phone', // Invalid format
        shopName: 'Test Shop',
        password: 'password123'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('should reject user with weak password', async () => {
      const userData = {
        name: 'Test User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'weak' // Too short
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('should reject product with negative price', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const productData = {
        user: user._id,
        name: 'Invalid Product',
        sellingPrice: -50, // Negative price
        stock: 10
      };

      const product = new Product(productData);
      await expect(product.save()).rejects.toThrow();
    });

    test('should reject transaction with negative amount', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Test Customer',
        phone: '9876543215'
      });

      const transactionData = {
        user: user._id,
        customer: customer._id,
        type: 'credit',
        amount: -100, // Negative amount
        balanceAfter: -100
      };

      const transaction = new Transaction(transactionData);
      await expect(transaction.save()).rejects.toThrow();
    });

    test('should reject duplicate unique fields', async () => {
      const user = await User.create({
        name: 'Shop Owner',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      // Create first customer
      await Customer.create({
        user: user._id,
        name: 'First Customer',
        phone: '9876543215'
      });

      // Try to create another customer with same phone for same user (should fail if unique constraint exists)
      // Note: The schema has unique: true for phone in combination with user
      await expect(Customer.create({
        user: user._id,
        name: 'Second Customer',
        phone: '9876543215' // Same phone as first customer
      })).rejects.toThrow();
    });
  });

  // DATABASE INDEX TESTS
  describe('Database Indexes', () => {
    test('should use indexes for efficient queries', async () => {
      const user = await User.create({
        name: 'Index Test User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      // Create multiple products to test index performance
      const products = [];
      for (let i = 0; i < 5; i++) {
        products.push({
          user: user._id,
          name: `Product ${i}`,
          sellingPrice: 100 + i * 10,
          stock: 10 + i * 5
        });
      }
      await Product.insertMany(products);

      // Query using indexed field (user)
      const startTime = Date.now();
      const userProducts = await Product.find({ user: user._id }).sort({ createdAt: -1 });
      const queryTime = Date.now() - startTime;

      expect(userProducts).toHaveLength(5);
      // Query time should be reasonable (under 100ms for this small dataset)
      expect(queryTime).toBeLessThan(100);
    });

    test('should handle compound indexes', async () => {
      const user = await User.create({
        name: 'Compound Index User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      // Create customers with same phone for different users (should work)
      await Customer.create({
        user: user._id,
        name: 'Customer 1',
        phone: '9876543215'
      });

      // Create another user
      const user2 = await User.create({
        name: 'Compound Index User 2',
        phone: '9876543211',
        shopName: 'Test Shop 2',
        password: 'password123'
      });

      // This should work because it's a different user
      await Customer.create({
        user: user2._id,
        name: 'Customer 2',
        phone: '9876543215' // Same phone as customer 1, but different user
      });
    });
  });

  // AGGREGATION TESTS
  describe('Aggregation Queries', () => {
    test('should aggregate product data correctly', async () => {
      const user = await User.create({
        name: 'Aggregation User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      // Create products with different prices and stocks
      const products = [
        { user: user._id, name: 'Cheap Product', sellingPrice: 50, stock: 10, costPrice: 40 },
        { user: user._id, name: 'Expensive Product', sellingPrice: 200, stock: 5, costPrice: 150 },
        { user: user._id, name: 'Medium Product', sellingPrice: 100, stock: 15, costPrice: 80 }
      ];
      await Product.insertMany(products);

      // Aggregate to get summary statistics
      const summary = await Product.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$stock', '$costPrice'] } },
            totalSellingValue: { $sum: { $multiply: ['$stock', '$sellingPrice'] } },
            avgPrice: { $avg: '$sellingPrice' },
            minPrice: { $min: '$sellingPrice' },
            maxPrice: { $max: '$sellingPrice' }
          }
        }
      ]);

      expect(summary).toHaveLength(1);
      expect(summary[0].totalProducts).toBe(3);
      expect(summary[0].totalValue).toBe(1700); // (10*40) + (5*150) + (15*80) = 400 + 750 + 1200 = 2350
      expect(summary[0].totalSellingValue).toBe(2950); // (10*50) + (5*200) + (15*100) = 500 + 1000 + 1500 = 3000
      expect(summary[0].avgPrice).toBeCloseTo(116.67, 2);
    });

    test('should aggregate transaction data correctly', async () => {
      const user = await User.create({
        name: 'Aggregation User',
        phone: '9876543210',
        shopName: 'Test Shop',
        password: 'password123'
      });

      const customer = await Customer.create({
        user: user._id,
        name: 'Aggregation Customer',
        phone: '9876543215'
      });

      // Create transactions
      await Transaction.create([
        {
          user: user._id,
          customer: customer._id,
          type: 'credit',
          amount: 100,
          balanceAfter: 100
        },
        {
          user: user._id,
          customer: customer._id,
          type: 'credit',
          amount: 150,
          balanceAfter: 250
        },
        {
          user: user._id,
          customer: customer._id,
          type: 'payment',
          amount: 75,
          balanceAfter: 175
        }
      ]);

      // Aggregate to get transaction summary
      const summary = await Transaction.aggregate([
        { $match: { user: user._id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' }
          }
        }
      ]);

      // Should have two groups: 'credit' and 'payment'
      const creditSummary = summary.find(item => item._id === 'credit');
      const paymentSummary = summary.find(item => item._id === 'payment');

      expect(creditSummary.count).toBe(2);
      expect(creditSummary.totalAmount).toBe(250); // 100 + 150
      expect(paymentSummary.count).toBe(1);
      expect(paymentSummary.totalAmount).toBe(75);
    });
  });
});
