// MongoDB Initialization Script
// This script runs when MongoDB container is first created

// Create application database and user
db = db.getSiblingDB('shopsmart-pro');

db.createUser({
  user: 'shopsmart',
  pwd: 'shopsmart123',
  roles: [
    {
      role: 'readWrite',
      db: 'shopsmart-pro'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { sparse: true });

db.customers.createIndex({ user: 1, name: 1 });
db.customers.createIndex({ user: 1, phone: 1 });
db.customers.createIndex({ user: 1, balance: 1 });

db.products.createIndex({ user: 1, name: 1 });
db.products.createIndex({ user: 1, barcode: 1 });
db.products.createIndex({ user: 1, category: 1 });
db.products.createIndex({ user: 1, stock: 1 });

db.transactions.createIndex({ user: 1, customer: 1, transactionDate: -1 });
db.transactions.createIndex({ user: 1, type: 1, transactionDate: -1 });

db.categories.createIndex({ user: 1, name: 1 });

// Create default categories for new shops
db.defaultCategories.insertMany([
  { name: 'Groceries', icon: '🛒', color: '#10b981' },
  { name: 'Dairy', icon: '🥛', color: '#3b82f6' },
  { name: 'Beverages', icon: '🥤', color: '#f59e0b' },
  { name: 'Snacks', icon: '🍿', color: '#ef4444' },
  { name: 'Personal Care', icon: '🧴', color: '#8b5cf6' },
  { name: 'Household', icon: '🏠', color: '#06b6d4' },
  { name: 'Stationery', icon: '📝', color: '#ec4899' },
  { name: 'Electronics', icon: '📱', color: '#6366f1' }
]);

print('Database initialized successfully!');
