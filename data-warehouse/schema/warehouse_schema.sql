-- ============================================================
-- ShopSmart Pro - Data Warehouse Schema
-- Analytics & Business Intelligence Infrastructure
-- ============================================================

-- ============================================================
-- DIMENSION TABLES (Slowly Changing Dimensions)
-- ============================================================

-- Dimension: Users/Shops
CREATE TABLE dim_users (
    user_key SERIAL PRIMARY KEY,
    user_id VARCHAR(24) NOT NULL UNIQUE,  -- MongoDB ObjectId
    name VARCHAR(255),
    phone VARCHAR(15),
    email VARCHAR(255),
    shop_name VARCHAR(255),
    shop_type VARCHAR(50),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    subscription_tier VARCHAR(20) DEFAULT 'free',
    registration_date DATE,
    last_active_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    -- SCD Type 2 fields
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP DEFAULT '9999-12-31',
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dimension: Customers
CREATE TABLE dim_customers (
    customer_key SERIAL PRIMARY KEY,
    customer_id VARCHAR(24) NOT NULL,
    user_key INT REFERENCES dim_users(user_key),
    name VARCHAR(255),
    phone VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    trust_score INT DEFAULT 3,
    customer_segment VARCHAR(50),  -- 'high_value', 'regular', 'occasional', 'new'
    first_transaction_date DATE,
    -- SCD Type 2 fields
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP DEFAULT '9999-12-31',
    is_current BOOLEAN DEFAULT TRUE
);

-- Dimension: Products
CREATE TABLE dim_products (
    product_key SERIAL PRIMARY KEY,
    product_id VARCHAR(24) NOT NULL,
    user_key INT REFERENCES dim_users(user_key),
    name VARCHAR(255),
    brand VARCHAR(100),
    category_name VARCHAR(100),
    category_icon VARCHAR(10),
    barcode VARCHAR(50),
    unit VARCHAR(20),
    selling_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    mrp DECIMAL(12,2),
    profit_margin DECIMAL(5,2),
    -- SCD Type 2 fields
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP DEFAULT '9999-12-31',
    is_current BOOLEAN DEFAULT TRUE
);

-- Dimension: Date (Pre-populated)
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY,  -- YYYYMMDD format
    full_date DATE NOT NULL,
    day_of_week INT,
    day_name VARCHAR(10),
    day_of_month INT,
    day_of_year INT,
    week_of_year INT,
    month_num INT,
    month_name VARCHAR(10),
    quarter INT,
    year INT,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN DEFAULT FALSE,
    holiday_name VARCHAR(100),
    fiscal_year INT,
    fiscal_quarter INT
);

-- Dimension: Time
CREATE TABLE dim_time (
    time_key INT PRIMARY KEY,  -- HHMM format
    full_time TIME NOT NULL,
    hour INT,
    minute INT,
    period VARCHAR(2),  -- AM/PM
    hour_12 INT,
    time_band VARCHAR(20)  -- 'morning', 'afternoon', 'evening', 'night'
);

-- Dimension: Payment Method
CREATE TABLE dim_payment_method (
    payment_method_key SERIAL PRIMARY KEY,
    method_code VARCHAR(20) NOT NULL UNIQUE,
    method_name VARCHAR(50),
    method_type VARCHAR(20),  -- 'digital', 'cash', 'credit'
    is_digital BOOLEAN
);

-- Insert payment methods
INSERT INTO dim_payment_method (method_code, method_name, method_type, is_digital) VALUES
('cash', 'Cash', 'cash', FALSE),
('upi', 'UPI', 'digital', TRUE),
('card', 'Credit/Debit Card', 'digital', TRUE),
('bank_transfer', 'Bank Transfer', 'digital', TRUE),
('cheque', 'Cheque', 'cash', FALSE),
('credit', 'Store Credit', 'credit', FALSE);

-- ============================================================
-- FACT TABLES
-- ============================================================

-- Fact: Transactions (Grain: One row per transaction)
CREATE TABLE fact_transactions (
    transaction_key SERIAL PRIMARY KEY,
    transaction_id VARCHAR(24) NOT NULL UNIQUE,
    
    -- Dimension Keys
    user_key INT REFERENCES dim_users(user_key),
    customer_key INT REFERENCES dim_customers(customer_key),
    date_key INT REFERENCES dim_date(date_key),
    time_key INT REFERENCES dim_time(time_key),
    payment_method_key INT REFERENCES dim_payment_method(payment_method_key),
    
    -- Transaction attributes
    transaction_type VARCHAR(10),  -- 'credit', 'payment'
    
    -- Measures
    amount DECIMAL(12,2),
    balance_before DECIMAL(12,2),
    balance_after DECIMAL(12,2),
    
    -- Metadata
    source_system VARCHAR(20) DEFAULT 'mongodb',
    etl_batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fact: Daily Customer Balances (Grain: One row per customer per day)
CREATE TABLE fact_daily_balances (
    balance_key SERIAL PRIMARY KEY,
    
    -- Dimension Keys
    user_key INT REFERENCES dim_users(user_key),
    customer_key INT REFERENCES dim_customers(customer_key),
    date_key INT REFERENCES dim_date(date_key),
    
    -- Measures
    opening_balance DECIMAL(12,2),
    total_credit DECIMAL(12,2),
    total_payments DECIMAL(12,2),
    closing_balance DECIMAL(12,2),
    transaction_count INT,
    
    -- Metadata
    etl_batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(customer_key, date_key)
);

-- Fact: Daily Inventory Snapshots (Grain: One row per product per day)
CREATE TABLE fact_daily_inventory (
    inventory_key SERIAL PRIMARY KEY,
    
    -- Dimension Keys
    user_key INT REFERENCES dim_users(user_key),
    product_key INT REFERENCES dim_products(product_key),
    date_key INT REFERENCES dim_date(date_key),
    
    -- Measures
    opening_stock DECIMAL(12,2),
    stock_added DECIMAL(12,2),
    stock_sold DECIMAL(12,2),
    stock_adjusted DECIMAL(12,2),
    closing_stock DECIMAL(12,2),
    stock_value DECIMAL(14,2),  -- closing_stock * cost_price
    potential_revenue DECIMAL(14,2),  -- closing_stock * selling_price
    
    -- Flags
    is_low_stock BOOLEAN,
    is_out_of_stock BOOLEAN,
    
    -- Metadata
    etl_batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_key, date_key)
);

-- Fact: Invoices (Grain: One row per invoice)
CREATE TABLE fact_invoices (
    invoice_key SERIAL PRIMARY KEY,
    invoice_id VARCHAR(24) NOT NULL UNIQUE,
    invoice_number VARCHAR(50),
    
    -- Dimension Keys
    user_key INT REFERENCES dim_users(user_key),
    customer_key INT REFERENCES dim_customers(customer_key),
    date_key INT REFERENCES dim_date(date_key),
    
    -- Measures
    subtotal DECIMAL(12,2),
    total_discount DECIMAL(12,2),
    total_tax DECIMAL(12,2),
    grand_total DECIMAL(12,2),
    amount_paid DECIMAL(12,2),
    balance_due DECIMAL(12,2),
    line_item_count INT,
    
    -- Status
    payment_status VARCHAR(20),
    invoice_status VARCHAR(20),
    
    -- Metadata
    etl_batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fact: Store Analytics (Grain: One row per store per day)
CREATE TABLE fact_store_analytics (
    analytics_key SERIAL PRIMARY KEY,
    
    -- Dimension Keys
    user_key INT REFERENCES dim_users(user_key),
    date_key INT REFERENCES dim_date(date_key),
    
    -- Measures
    page_views INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    whatsapp_clicks INT DEFAULT 0,
    product_views INT DEFAULT 0,
    orders_initiated INT DEFAULT 0,
    
    -- Metadata
    etl_batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_key, date_key)
);

-- Fact: User Activity (Grain: One row per user per day)
CREATE TABLE fact_user_activity (
    activity_key SERIAL PRIMARY KEY,
    
    -- Dimension Keys
    user_key INT REFERENCES dim_users(user_key),
    date_key INT REFERENCES dim_date(date_key),
    
    -- Measures
    login_count INT DEFAULT 0,
    session_duration_minutes INT DEFAULT 0,
    customers_added INT DEFAULT 0,
    products_added INT DEFAULT 0,
    transactions_created INT DEFAULT 0,
    invoices_created INT DEFAULT 0,
    whatsapp_reminders_sent INT DEFAULT 0,
    
    -- Flags
    is_active_day BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    etl_batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_key, date_key)
);

-- ============================================================
-- AGGREGATION TABLES (For Performance)
-- ============================================================

-- Monthly User Summary
CREATE TABLE agg_monthly_user_summary (
    summary_key SERIAL PRIMARY KEY,
    user_key INT REFERENCES dim_users(user_key),
    year INT,
    month INT,
    
    -- Business Metrics
    total_credit_given DECIMAL(14,2),
    total_payments_received DECIMAL(14,2),
    net_credit_change DECIMAL(14,2),
    ending_receivables DECIMAL(14,2),
    
    -- Customer Metrics
    active_customers INT,
    new_customers INT,
    customers_with_balance INT,
    
    -- Inventory Metrics
    total_inventory_value DECIMAL(14,2),
    products_sold_count INT,
    low_stock_alerts INT,
    
    -- Engagement Metrics
    active_days INT,
    total_transactions INT,
    invoices_generated INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_key, year, month)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_fact_txn_user_date ON fact_transactions(user_key, date_key);
CREATE INDEX idx_fact_txn_customer ON fact_transactions(customer_key);
CREATE INDEX idx_fact_txn_type ON fact_transactions(transaction_type);

CREATE INDEX idx_fact_balance_user_date ON fact_daily_balances(user_key, date_key);
CREATE INDEX idx_fact_inventory_user_date ON fact_daily_inventory(user_key, date_key);
CREATE INDEX idx_fact_inventory_low_stock ON fact_daily_inventory(is_low_stock) WHERE is_low_stock = TRUE;

CREATE INDEX idx_dim_users_active ON dim_users(is_active, is_current);
CREATE INDEX idx_dim_customers_current ON dim_customers(is_current);
CREATE INDEX idx_dim_products_current ON dim_products(is_current);

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View: Current User Summary
CREATE VIEW vw_current_user_summary AS
SELECT 
    u.user_id,
    u.shop_name,
    u.city,
    u.subscription_tier,
    COUNT(DISTINCT c.customer_key) as total_customers,
    COUNT(DISTINCT p.product_key) as total_products,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END), 0) as total_credit,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END), 0) as total_payments
FROM dim_users u
LEFT JOIN dim_customers c ON u.user_key = c.user_key AND c.is_current = TRUE
LEFT JOIN dim_products p ON u.user_key = p.user_key AND p.is_current = TRUE
LEFT JOIN fact_transactions t ON u.user_key = t.user_key
WHERE u.is_current = TRUE AND u.is_active = TRUE
GROUP BY u.user_key, u.user_id, u.shop_name, u.city, u.subscription_tier;

-- View: Customer Receivables
CREATE VIEW vw_customer_receivables AS
SELECT 
    u.shop_name,
    c.name as customer_name,
    c.phone as customer_phone,
    c.customer_segment,
    db.closing_balance as current_balance,
    db.date_key as balance_date
FROM fact_daily_balances db
JOIN dim_users u ON db.user_key = u.user_key
JOIN dim_customers c ON db.customer_key = c.customer_key
JOIN dim_date d ON db.date_key = d.date_key
WHERE d.full_date = CURRENT_DATE
  AND db.closing_balance > 0
  AND u.is_current = TRUE
  AND c.is_current = TRUE
ORDER BY db.closing_balance DESC;

-- View: Low Stock Products
CREATE VIEW vw_low_stock_products AS
SELECT 
    u.shop_name,
    p.name as product_name,
    p.brand,
    p.category_name,
    di.closing_stock,
    p.unit,
    p.selling_price,
    di.stock_value
FROM fact_daily_inventory di
JOIN dim_users u ON di.user_key = u.user_key
JOIN dim_products p ON di.product_key = p.product_key
JOIN dim_date d ON di.date_key = d.date_key
WHERE d.full_date = CURRENT_DATE
  AND di.is_low_stock = TRUE
  AND u.is_current = TRUE
  AND p.is_current = TRUE
ORDER BY di.closing_stock ASC;
