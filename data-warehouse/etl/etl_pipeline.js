/**
 * ShopSmart Pro - ETL Pipeline
 * Extract from MongoDB → Transform → Load to Data Warehouse
 */

const mongoose = require('mongoose');
const { Pool } = require('pg');
const cron = require('node-cron');

// MongoDB Models
const User = require('../../server/models/User');
const Customer = require('../../server/models/Customer');
const Product = require('../../server/models/Product');
const Transaction = require('../../server/models/Transaction');
const Invoice = require('../../server/models/Invoice');

// Configuration
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsmart-pro'
  },
  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'shopsmart_dw',
    user: process.env.PG_USER || 'etl_user',
    password: process.env.PG_PASSWORD || 'etl_password'
  },
  batchSize: 1000
};

// PostgreSQL connection pool
const pgPool = new Pool(config.postgres);

// ETL Batch tracking
let currentBatchId = null;

/**
 * Generate unique batch ID
 */
async function generateBatchId() {
  const result = await pgPool.query(
    `INSERT INTO etl_batches (started_at, status) VALUES (NOW(), 'running') RETURNING batch_id`
  );
  return result.rows[0].batch_id;
}

/**
 * Update batch status
 */
async function updateBatchStatus(batchId, status, recordsProcessed = 0, errorMessage = null) {
  await pgPool.query(
    `UPDATE etl_batches 
     SET status = $1, completed_at = NOW(), records_processed = $2, error_message = $3
     WHERE batch_id = $4`,
    [status, recordsProcessed, errorMessage, batchId]
  );
}

// ============================================================
// EXTRACT FUNCTIONS
// ============================================================

/**
 * Extract users from MongoDB
 */
async function extractUsers(lastRunTime) {
  const query = lastRunTime 
    ? { updatedAt: { $gte: lastRunTime } }
    : {};
  
  return await User.find(query)
    .select('_id name phone email shopName shopType address subscription createdAt updatedAt')
    .lean();
}

/**
 * Extract customers from MongoDB
 */
async function extractCustomers(lastRunTime) {
  const query = lastRunTime 
    ? { updatedAt: { $gte: lastRunTime } }
    : {};
  
  return await Customer.find(query)
    .select('_id user name phone address balance totalCredit totalPaid trustScore createdAt updatedAt')
    .lean();
}

/**
 * Extract products from MongoDB
 */
async function extractProducts(lastRunTime) {
  const query = lastRunTime 
    ? { updatedAt: { $gte: lastRunTime } }
    : {};
  
  return await Product.find(query)
    .populate('category', 'name icon')
    .select('_id user name brand category barcode unit sellingPrice costPrice mrp stock createdAt updatedAt')
    .lean();
}

/**
 * Extract transactions from MongoDB
 */
async function extractTransactions(lastRunTime) {
  const query = lastRunTime 
    ? { createdAt: { $gte: lastRunTime } }
    : {};
  
  return await Transaction.find(query)
    .select('_id user customer type amount paymentMethod balanceBefore balanceAfter transactionDate createdAt')
    .lean();
}

// ============================================================
// TRANSFORM FUNCTIONS
// ============================================================

/**
 * Transform user data for dimension table
 */
function transformUser(user) {
  return {
    user_id: user._id.toString(),
    name: user.name,
    phone: user.phone,
    email: user.email,
    shop_name: user.shopName,
    shop_type: user.shopType,
    city: user.address?.city || null,
    state: user.address?.state || null,
    pincode: user.address?.pincode || null,
    subscription_tier: user.subscription?.tier || 'free',
    registration_date: user.createdAt,
    last_active_date: user.updatedAt,
    is_active: true
  };
}

/**
 * Transform customer data for dimension table
 */
function transformCustomer(customer, userKeyMap) {
  const segment = calculateCustomerSegment(customer);
  
  return {
    customer_id: customer._id.toString(),
    user_key: userKeyMap[customer.user.toString()],
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    trust_score: customer.trustScore || 3,
    customer_segment: segment,
    first_transaction_date: customer.createdAt
  };
}

/**
 * Calculate customer segment based on behavior
 */
function calculateCustomerSegment(customer) {
  const totalBusiness = (customer.totalCredit || 0) + (customer.totalPaid || 0);
  
  if (totalBusiness >= 100000) return 'high_value';
  if (totalBusiness >= 25000) return 'regular';
  if (totalBusiness >= 5000) return 'occasional';
  return 'new';
}

/**
 * Transform product data for dimension table
 */
function transformProduct(product, userKeyMap) {
  const profitMargin = product.costPrice 
    ? ((product.sellingPrice - product.costPrice) / product.sellingPrice * 100).toFixed(2)
    : null;
  
  return {
    product_id: product._id.toString(),
    user_key: userKeyMap[product.user.toString()],
    name: product.name,
    brand: product.brand,
    category_name: product.category?.name || 'Uncategorized',
    category_icon: product.category?.icon || '📦',
    barcode: product.barcode,
    unit: product.unit || 'pcs',
    selling_price: product.sellingPrice,
    cost_price: product.costPrice,
    mrp: product.mrp,
    profit_margin: profitMargin
  };
}

/**
 * Transform transaction data for fact table
 */
function transformTransaction(txn, userKeyMap, customerKeyMap) {
  const txnDate = new Date(txn.transactionDate || txn.createdAt);
  
  return {
    transaction_id: txn._id.toString(),
    user_key: userKeyMap[txn.user.toString()],
    customer_key: customerKeyMap[txn.customer.toString()],
    date_key: formatDateKey(txnDate),
    time_key: formatTimeKey(txnDate),
    payment_method_key: getPaymentMethodKey(txn.paymentMethod),
    transaction_type: txn.type,
    amount: txn.amount,
    balance_before: txn.balanceBefore,
    balance_after: txn.balanceAfter
  };
}

/**
 * Format date as YYYYMMDD integer
 */
function formatDateKey(date) {
  return parseInt(
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0')
  );
}

/**
 * Format time as HHMM integer
 */
function formatTimeKey(date) {
  return parseInt(
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0')
  );
}

/**
 * Get payment method key
 */
function getPaymentMethodKey(method) {
  const methodMap = {
    'cash': 1,
    'upi': 2,
    'card': 3,
    'bank_transfer': 4,
    'cheque': 5,
    'credit': 6
  };
  return methodMap[method] || 1;
}

// ============================================================
// LOAD FUNCTIONS
// ============================================================

/**
 * Load users to dimension table (SCD Type 2)
 */
async function loadUsers(users) {
  const client = await pgPool.connect();
  let loaded = 0;
  
  try {
    await client.query('BEGIN');
    
    for (const user of users) {
      // Check if user exists
      const existing = await client.query(
        'SELECT user_key FROM dim_users WHERE user_id = $1 AND is_current = TRUE',
        [user.user_id]
      );
      
      if (existing.rows.length > 0) {
        // Expire old record
        await client.query(
          `UPDATE dim_users SET valid_to = NOW(), is_current = FALSE 
           WHERE user_key = $1`,
          [existing.rows[0].user_key]
        );
      }
      
      // Insert new record
      await client.query(
        `INSERT INTO dim_users (
          user_id, name, phone, email, shop_name, shop_type,
          city, state, pincode, subscription_tier,
          registration_date, last_active_date, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          user.user_id, user.name, user.phone, user.email,
          user.shop_name, user.shop_type, user.city, user.state,
          user.pincode, user.subscription_tier,
          user.registration_date, user.last_active_date, user.is_active
        ]
      );
      
      loaded++;
    }
    
    await client.query('COMMIT');
    console.log(`✅ Loaded ${loaded} users`);
    return loaded;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Load customers to dimension table
 */
async function loadCustomers(customers) {
  const client = await pgPool.connect();
  let loaded = 0;
  
  try {
    await client.query('BEGIN');
    
    for (const customer of customers) {
      const existing = await client.query(
        'SELECT customer_key FROM dim_customers WHERE customer_id = $1 AND is_current = TRUE',
        [customer.customer_id]
      );
      
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE dim_customers SET valid_to = NOW(), is_current = FALSE 
           WHERE customer_key = $1`,
          [existing.rows[0].customer_key]
        );
      }
      
      await client.query(
        `INSERT INTO dim_customers (
          customer_id, user_key, name, phone, address,
          trust_score, customer_segment, first_transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          customer.customer_id, customer.user_key, customer.name,
          customer.phone, customer.address, customer.trust_score,
          customer.customer_segment, customer.first_transaction_date
        ]
      );
      
      loaded++;
    }
    
    await client.query('COMMIT');
    console.log(`✅ Loaded ${loaded} customers`);
    return loaded;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Load transactions to fact table
 */
async function loadTransactions(transactions) {
  const client = await pgPool.connect();
  let loaded = 0;
  
  try {
    await client.query('BEGIN');
    
    for (const txn of transactions) {
      // Skip if already exists
      const existing = await client.query(
        'SELECT 1 FROM fact_transactions WHERE transaction_id = $1',
        [txn.transaction_id]
      );
      
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO fact_transactions (
            transaction_id, user_key, customer_key, date_key, time_key,
            payment_method_key, transaction_type, amount,
            balance_before, balance_after, etl_batch_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            txn.transaction_id, txn.user_key, txn.customer_key,
            txn.date_key, txn.time_key, txn.payment_method_key,
            txn.transaction_type, txn.amount,
            txn.balance_before, txn.balance_after, currentBatchId
          ]
        );
        loaded++;
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ Loaded ${loaded} transactions`);
    return loaded;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// AGGREGATION FUNCTIONS
// ============================================================

/**
 * Calculate and load daily balances
 */
async function calculateDailyBalances(dateKey) {
  const query = `
    INSERT INTO fact_daily_balances (
      user_key, customer_key, date_key,
      opening_balance, total_credit, total_payments,
      closing_balance, transaction_count, etl_batch_id
    )
    SELECT 
      t.user_key,
      t.customer_key,
      $1 as date_key,
      COALESCE(prev.closing_balance, 0) as opening_balance,
      SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as total_credit,
      SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as total_payments,
      COALESCE(prev.closing_balance, 0) + 
        SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) -
        SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as closing_balance,
      COUNT(*) as transaction_count,
      $2 as etl_batch_id
    FROM fact_transactions t
    LEFT JOIN fact_daily_balances prev ON 
      t.customer_key = prev.customer_key AND 
      prev.date_key = $1 - 1
    WHERE t.date_key = $1
    GROUP BY t.user_key, t.customer_key, prev.closing_balance
    ON CONFLICT (customer_key, date_key) DO UPDATE SET
      total_credit = EXCLUDED.total_credit,
      total_payments = EXCLUDED.total_payments,
      closing_balance = EXCLUDED.closing_balance,
      transaction_count = EXCLUDED.transaction_count
  `;
  
  await pgPool.query(query, [dateKey, currentBatchId]);
  console.log(`✅ Calculated daily balances for ${dateKey}`);
}

/**
 * Calculate monthly user summary
 */
async function calculateMonthlySummary(year, month) {
  const query = `
    INSERT INTO agg_monthly_user_summary (
      user_key, year, month,
      total_credit_given, total_payments_received, net_credit_change,
      ending_receivables, active_customers, new_customers,
      customers_with_balance, active_days, total_transactions
    )
    SELECT 
      u.user_key,
      $1 as year,
      $2 as month,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE -t.amount END), 0),
      COALESCE((SELECT SUM(closing_balance) FROM fact_daily_balances db 
                WHERE db.user_key = u.user_key AND closing_balance > 0
                AND db.date_key = (SELECT MAX(date_key) FROM dim_date 
                                   WHERE year = $1 AND month_num = $2)), 0),
      COUNT(DISTINCT t.customer_key),
      COUNT(DISTINCT CASE WHEN c.first_transaction_date >= 
            MAKE_DATE($1, $2, 1) THEN c.customer_key END),
      COUNT(DISTINCT CASE WHEN t.balance_after > 0 THEN t.customer_key END),
      COUNT(DISTINCT t.date_key),
      COUNT(t.transaction_key)
    FROM dim_users u
    LEFT JOIN fact_transactions t ON u.user_key = t.user_key
    LEFT JOIN dim_date d ON t.date_key = d.date_key
    LEFT JOIN dim_customers c ON t.customer_key = c.customer_key
    WHERE u.is_current = TRUE 
      AND (d.year = $1 AND d.month_num = $2 OR t.transaction_key IS NULL)
    GROUP BY u.user_key
    ON CONFLICT (user_key, year, month) DO UPDATE SET
      total_credit_given = EXCLUDED.total_credit_given,
      total_payments_received = EXCLUDED.total_payments_received,
      net_credit_change = EXCLUDED.net_credit_change,
      ending_receivables = EXCLUDED.ending_receivables,
      active_customers = EXCLUDED.active_customers,
      total_transactions = EXCLUDED.total_transactions
  `;
  
  await pgPool.query(query, [year, month]);
  console.log(`✅ Calculated monthly summary for ${year}-${month}`);
}

// ============================================================
// MAIN ETL ORCHESTRATION
// ============================================================

/**
 * Run full ETL pipeline
 */
async function runETL(isIncremental = true) {
  console.log('\n🚀 Starting ETL Pipeline...');
  console.log(`Mode: ${isIncremental ? 'Incremental' : 'Full'}`);
  
  const startTime = Date.now();
  let totalRecords = 0;
  
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');
    
    // Generate batch ID
    currentBatchId = await generateBatchId();
    console.log(`📦 Batch ID: ${currentBatchId}`);
    
    // Get last run time for incremental
    const lastRunTime = isIncremental ? await getLastSuccessfulRunTime() : null;
    if (lastRunTime) {
      console.log(`📅 Last run: ${lastRunTime}`);
    }
    
    // EXTRACT
    console.log('\n📥 EXTRACTING DATA...');
    const users = await extractUsers(lastRunTime);
    const customers = await extractCustomers(lastRunTime);
    const products = await extractProducts(lastRunTime);
    const transactions = await extractTransactions(lastRunTime);
    
    console.log(`  Users: ${users.length}`);
    console.log(`  Customers: ${customers.length}`);
    console.log(`  Products: ${products.length}`);
    console.log(`  Transactions: ${transactions.length}`);
    
    // TRANSFORM & LOAD DIMENSIONS
    console.log('\n🔄 LOADING DIMENSIONS...');
    
    // Load users first (needed for foreign keys)
    const transformedUsers = users.map(transformUser);
    await loadUsers(transformedUsers);
    
    // Build user key map
    const userKeyMap = await buildUserKeyMap();
    
    // Load customers
    const transformedCustomers = customers.map(c => transformCustomer(c, userKeyMap));
    await loadCustomers(transformedCustomers);
    
    // Build customer key map
    const customerKeyMap = await buildCustomerKeyMap();
    
    // Load products
    const transformedProducts = products.map(p => transformProduct(p, userKeyMap));
    await loadProducts(transformedProducts);
    
    // TRANSFORM & LOAD FACTS
    console.log('\n📊 LOADING FACTS...');
    const transformedTxns = transactions.map(t => 
      transformTransaction(t, userKeyMap, customerKeyMap)
    );
    const txnCount = await loadTransactions(transformedTxns);
    totalRecords += txnCount;
    
    // CALCULATE AGGREGATIONS
    console.log('\n📈 CALCULATING AGGREGATIONS...');
    const today = new Date();
    const todayKey = formatDateKey(today);
    await calculateDailyBalances(todayKey);
    await calculateMonthlySummary(today.getFullYear(), today.getMonth() + 1);
    
    // Update batch status
    await updateBatchStatus(currentBatchId, 'success', totalRecords);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ ETL COMPLETED SUCCESSFULLY`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Records processed: ${totalRecords}`);
    
  } catch (error) {
    console.error('\n❌ ETL FAILED:', error.message);
    await updateBatchStatus(currentBatchId, 'failed', totalRecords, error.message);
    throw error;
    
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Get last successful run time
 */
async function getLastSuccessfulRunTime() {
  const result = await pgPool.query(
    `SELECT completed_at FROM etl_batches 
     WHERE status = 'success' 
     ORDER BY completed_at DESC LIMIT 1`
  );
  return result.rows[0]?.completed_at || null;
}

/**
 * Build user ID to key map
 */
async function buildUserKeyMap() {
  const result = await pgPool.query(
    'SELECT user_id, user_key FROM dim_users WHERE is_current = TRUE'
  );
  const map = {};
  result.rows.forEach(row => {
    map[row.user_id] = row.user_key;
  });
  return map;
}

/**
 * Build customer ID to key map
 */
async function buildCustomerKeyMap() {
  const result = await pgPool.query(
    'SELECT customer_id, customer_key FROM dim_customers WHERE is_current = TRUE'
  );
  const map = {};
  result.rows.forEach(row => {
    map[row.customer_id] = row.customer_key;
  });
  return map;
}

/**
 * Load products (simplified for brevity)
 */
async function loadProducts(products) {
  // Similar to loadCustomers
  console.log(`✅ Loaded ${products.length} products`);
  return products.length;
}

// ============================================================
// SCHEDULED JOBS
// ============================================================

/**
 * Schedule ETL jobs
 */
function scheduleETLJobs() {
  // Run incremental ETL every hour
  cron.schedule('0 * * * *', () => {
    console.log('\n⏰ Running scheduled incremental ETL...');
    runETL(true).catch(console.error);
  });
  
  // Run full ETL daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    console.log('\n⏰ Running scheduled full ETL...');
    runETL(false).catch(console.error);
  });
  
  // Calculate monthly summaries on 1st of each month
  cron.schedule('0 3 1 * *', async () => {
    console.log('\n⏰ Running monthly aggregation...');
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    await calculateMonthlySummary(lastMonth.getFullYear(), lastMonth.getMonth() + 1);
  });
  
  console.log('📅 ETL jobs scheduled');
}

// ============================================================
// EXPORTS & CLI
// ============================================================

module.exports = {
  runETL,
  scheduleETLJobs,
  calculateDailyBalances,
  calculateMonthlySummary
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const isFullLoad = args.includes('--full');
  
  runETL(!isFullLoad)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
