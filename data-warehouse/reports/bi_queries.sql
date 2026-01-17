-- ============================================================
-- ShopSmart Pro - Business Intelligence Reporting Queries
-- Dashboard & Analytics Reports
-- ============================================================

-- ============================================================
-- EXECUTIVE DASHBOARD QUERIES
-- ============================================================

-- KPI: Total Platform Metrics
-- Used for: Admin dashboard, investor reports
CREATE OR REPLACE VIEW bi_platform_kpis AS
SELECT 
    COUNT(DISTINCT u.user_key) as total_shops,
    COUNT(DISTINCT CASE WHEN u.registration_date >= CURRENT_DATE - INTERVAL '30 days' 
                        THEN u.user_key END) as new_shops_30d,
    COUNT(DISTINCT CASE WHEN ua.date_key >= (SELECT date_key FROM dim_date WHERE full_date = CURRENT_DATE - 7) 
                        THEN ua.user_key END) as active_shops_7d,
    
    COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'credit'), 0) as total_credit_volume,
    COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'payment'), 0) as total_payment_volume,
    
    COUNT(DISTINCT c.customer_key) as total_customers,
    COUNT(DISTINCT p.product_key) as total_products,
    COUNT(DISTINCT t.transaction_key) as total_transactions
FROM dim_users u
LEFT JOIN fact_user_activity ua ON u.user_key = ua.user_key
LEFT JOIN fact_transactions t ON u.user_key = t.user_key
LEFT JOIN dim_customers c ON u.user_key = c.user_key AND c.is_current = TRUE
LEFT JOIN dim_products p ON u.user_key = p.user_key AND p.is_current = TRUE
WHERE u.is_current = TRUE AND u.is_active = TRUE;

-- Daily Transaction Trends (Last 30 days)
-- Used for: Trend charts, growth analysis
CREATE OR REPLACE VIEW bi_daily_transaction_trends AS
SELECT 
    d.full_date,
    d.day_name,
    d.is_weekend,
    COUNT(DISTINCT t.user_key) as active_shops,
    COUNT(t.transaction_key) as transaction_count,
    SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as credit_amount,
    SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as payment_amount,
    SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) - 
    SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as net_credit,
    AVG(t.amount) as avg_transaction_amount
FROM dim_date d
LEFT JOIN fact_transactions t ON d.date_key = t.date_key
WHERE d.full_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE
GROUP BY d.date_key, d.full_date, d.day_name, d.is_weekend
ORDER BY d.full_date;

-- ============================================================
-- SHOP OWNER DASHBOARD QUERIES
-- ============================================================

-- Shop Dashboard Summary
-- Parameters: :user_key
CREATE OR REPLACE FUNCTION get_shop_dashboard(p_user_key INT)
RETURNS TABLE (
    today_credit DECIMAL,
    today_payment DECIMAL,
    today_transactions INT,
    total_receivables DECIMAL,
    customers_with_balance INT,
    total_customers INT,
    total_products INT,
    low_stock_products INT,
    out_of_stock_products INT,
    inventory_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH today_stats AS (
        SELECT 
            SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as credit,
            SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as payment,
            COUNT(*) as txn_count
        FROM fact_transactions t
        JOIN dim_date d ON t.date_key = d.date_key
        WHERE t.user_key = p_user_key AND d.full_date = CURRENT_DATE
    ),
    receivables AS (
        SELECT 
            SUM(closing_balance) as total,
            COUNT(CASE WHEN closing_balance > 0 THEN 1 END) as with_balance
        FROM fact_daily_balances db
        JOIN dim_date d ON db.date_key = d.date_key
        WHERE db.user_key = p_user_key AND d.full_date = CURRENT_DATE
    ),
    customers AS (
        SELECT COUNT(*) as total
        FROM dim_customers 
        WHERE user_key = p_user_key AND is_current = TRUE
    ),
    inventory AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN is_low_stock THEN 1 END) as low,
            COUNT(CASE WHEN is_out_of_stock THEN 1 END) as out,
            SUM(stock_value) as value
        FROM fact_daily_inventory di
        JOIN dim_date d ON di.date_key = d.date_key
        WHERE di.user_key = p_user_key AND d.full_date = CURRENT_DATE
    )
    SELECT 
        ts.credit,
        ts.payment,
        ts.txn_count::INT,
        r.total,
        r.with_balance::INT,
        c.total::INT,
        i.total::INT,
        i.low::INT,
        i.out::INT,
        i.value
    FROM today_stats ts, receivables r, customers c, inventory i;
END;
$$ LANGUAGE plpgsql;

-- Customer Receivables Report
-- Parameters: :user_key, :min_balance (optional)
CREATE OR REPLACE FUNCTION get_customer_receivables(
    p_user_key INT,
    p_min_balance DECIMAL DEFAULT 0
)
RETURNS TABLE (
    customer_name VARCHAR,
    customer_phone VARCHAR,
    customer_segment VARCHAR,
    current_balance DECIMAL,
    total_credit DECIMAL,
    total_paid DECIMAL,
    last_transaction_date DATE,
    days_since_last_payment INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name,
        c.phone,
        c.customer_segment,
        db.closing_balance,
        SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as total_credit,
        SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as total_paid,
        MAX(d.full_date) as last_txn_date,
        CURRENT_DATE - MAX(d.full_date) FILTER (WHERE t.transaction_type = 'payment') as days_since_payment
    FROM dim_customers c
    JOIN fact_daily_balances db ON c.customer_key = db.customer_key
    JOIN dim_date dd ON db.date_key = dd.date_key
    LEFT JOIN fact_transactions t ON c.customer_key = t.customer_key
    LEFT JOIN dim_date d ON t.date_key = d.date_key
    WHERE c.user_key = p_user_key 
      AND c.is_current = TRUE
      AND dd.full_date = CURRENT_DATE
      AND db.closing_balance >= p_min_balance
    GROUP BY c.customer_key, c.name, c.phone, c.customer_segment, db.closing_balance
    ORDER BY db.closing_balance DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- REVENUE & FINANCIAL REPORTS
-- ============================================================

-- Monthly Revenue Analysis
-- Used for: Financial reports, growth tracking
CREATE OR REPLACE VIEW bi_monthly_revenue AS
SELECT 
    d.year,
    d.month_num as month,
    d.month_name,
    COUNT(DISTINCT t.user_key) as active_shops,
    COUNT(DISTINCT t.customer_key) as unique_customers,
    COUNT(t.transaction_key) as total_transactions,
    SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as credit_volume,
    SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as payment_volume,
    AVG(t.amount) as avg_transaction,
    -- MoM Growth
    LAG(SUM(t.amount)) OVER (ORDER BY d.year, d.month_num) as prev_month_volume,
    ROUND(
        (SUM(t.amount) - LAG(SUM(t.amount)) OVER (ORDER BY d.year, d.month_num)) / 
        NULLIF(LAG(SUM(t.amount)) OVER (ORDER BY d.year, d.month_num), 0) * 100, 2
    ) as mom_growth_pct
FROM dim_date d
JOIN fact_transactions t ON d.date_key = t.date_key
GROUP BY d.year, d.month_num, d.month_name
ORDER BY d.year DESC, d.month_num DESC;

-- Payment Method Analysis
-- Used for: Understanding payment preferences
CREATE OR REPLACE VIEW bi_payment_method_analysis AS
SELECT 
    pm.method_name,
    pm.method_type,
    pm.is_digital,
    COUNT(t.transaction_key) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount,
    ROUND(COUNT(t.transaction_key) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pct_of_transactions,
    ROUND(SUM(t.amount) * 100.0 / SUM(SUM(t.amount)) OVER (), 2) as pct_of_amount
FROM fact_transactions t
JOIN dim_payment_method pm ON t.payment_method_key = pm.payment_method_key
WHERE t.transaction_type = 'payment'
GROUP BY pm.payment_method_key, pm.method_name, pm.method_type, pm.is_digital
ORDER BY total_amount DESC;

-- ============================================================
-- CUSTOMER ANALYTICS
-- ============================================================

-- Customer Segmentation Analysis
CREATE OR REPLACE VIEW bi_customer_segments AS
SELECT 
    c.customer_segment,
    COUNT(DISTINCT c.customer_key) as customer_count,
    SUM(db.closing_balance) as total_receivables,
    AVG(db.closing_balance) as avg_balance,
    SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as total_credit,
    SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as total_payments,
    AVG(c.trust_score) as avg_trust_score
FROM dim_customers c
LEFT JOIN fact_daily_balances db ON c.customer_key = db.customer_key
LEFT JOIN dim_date d ON db.date_key = d.date_key AND d.full_date = CURRENT_DATE
LEFT JOIN fact_transactions t ON c.customer_key = t.customer_key
WHERE c.is_current = TRUE
GROUP BY c.customer_segment
ORDER BY total_credit DESC;

-- Top Customers by Credit Volume
CREATE OR REPLACE FUNCTION get_top_customers(
    p_user_key INT,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    rank_num INT,
    customer_name VARCHAR,
    phone VARCHAR,
    segment VARCHAR,
    total_credit DECIMAL,
    total_payments DECIMAL,
    current_balance DECIMAL,
    trust_score INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) DESC)::INT,
        c.name,
        c.phone,
        c.customer_segment,
        SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END),
        SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END),
        COALESCE(db.closing_balance, 0),
        c.trust_score
    FROM dim_customers c
    LEFT JOIN fact_transactions t ON c.customer_key = t.customer_key
    LEFT JOIN fact_daily_balances db ON c.customer_key = db.customer_key 
        AND db.date_key = (SELECT date_key FROM dim_date WHERE full_date = CURRENT_DATE)
    WHERE c.user_key = p_user_key AND c.is_current = TRUE
    GROUP BY c.customer_key, c.name, c.phone, c.customer_segment, c.trust_score, db.closing_balance
    ORDER BY SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INVENTORY ANALYTICS
-- ============================================================

-- Inventory Health Report
CREATE OR REPLACE FUNCTION get_inventory_health(p_user_key INT)
RETURNS TABLE (
    total_products INT,
    in_stock INT,
    low_stock INT,
    out_of_stock INT,
    total_value DECIMAL,
    avg_stock_days DECIMAL,
    categories_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT,
        COUNT(CASE WHEN NOT is_low_stock AND NOT is_out_of_stock THEN 1 END)::INT,
        COUNT(CASE WHEN is_low_stock AND NOT is_out_of_stock THEN 1 END)::INT,
        COUNT(CASE WHEN is_out_of_stock THEN 1 END)::INT,
        SUM(stock_value),
        AVG(CASE WHEN di.closing_stock > 0 
            THEN di.closing_stock / NULLIF(
                (SELECT AVG(stock_sold) FROM fact_daily_inventory di2 
                 WHERE di2.product_key = di.product_key AND stock_sold > 0), 0
            ) END),
        COUNT(DISTINCT p.category_name)::INT
    FROM fact_daily_inventory di
    JOIN dim_products p ON di.product_key = p.product_key
    JOIN dim_date d ON di.date_key = d.date_key
    WHERE di.user_key = p_user_key 
      AND d.full_date = CURRENT_DATE
      AND p.is_current = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Category-wise Inventory Analysis
CREATE OR REPLACE VIEW bi_inventory_by_category AS
SELECT 
    p.category_name,
    p.category_icon,
    COUNT(DISTINCT p.product_key) as product_count,
    SUM(di.closing_stock) as total_stock,
    SUM(di.stock_value) as stock_value,
    SUM(di.potential_revenue) as potential_revenue,
    AVG(p.profit_margin) as avg_margin,
    COUNT(CASE WHEN di.is_low_stock THEN 1 END) as low_stock_count
FROM dim_products p
JOIN fact_daily_inventory di ON p.product_key = di.product_key
JOIN dim_date d ON di.date_key = d.date_key
WHERE d.full_date = CURRENT_DATE AND p.is_current = TRUE
GROUP BY p.category_name, p.category_icon
ORDER BY stock_value DESC;

-- ============================================================
-- USER ENGAGEMENT ANALYTICS
-- ============================================================

-- User Retention Cohorts
CREATE OR REPLACE VIEW bi_user_retention_cohorts AS
WITH cohorts AS (
    SELECT 
        user_key,
        DATE_TRUNC('month', registration_date) as cohort_month
    FROM dim_users
    WHERE is_current = TRUE
),
activity AS (
    SELECT 
        ua.user_key,
        DATE_TRUNC('month', d.full_date) as activity_month
    FROM fact_user_activity ua
    JOIN dim_date d ON ua.date_key = d.date_key
    WHERE ua.is_active_day = TRUE
)
SELECT 
    c.cohort_month,
    a.activity_month,
    EXTRACT(MONTH FROM AGE(a.activity_month, c.cohort_month))::INT as months_since_signup,
    COUNT(DISTINCT c.user_key) as cohort_size,
    COUNT(DISTINCT a.user_key) as active_users,
    ROUND(COUNT(DISTINCT a.user_key) * 100.0 / COUNT(DISTINCT c.user_key), 2) as retention_rate
FROM cohorts c
LEFT JOIN activity a ON c.user_key = a.user_key
GROUP BY c.cohort_month, a.activity_month
ORDER BY c.cohort_month, months_since_signup;

-- Daily Active Users (DAU) Trend
CREATE OR REPLACE VIEW bi_dau_trend AS
SELECT 
    d.full_date,
    d.day_name,
    d.is_weekend,
    COUNT(DISTINCT ua.user_key) as dau,
    AVG(ua.session_duration_minutes) as avg_session_minutes,
    SUM(ua.transactions_created) as total_transactions,
    -- 7-day moving average
    AVG(COUNT(DISTINCT ua.user_key)) OVER (
        ORDER BY d.full_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as dau_7d_avg
FROM dim_date d
LEFT JOIN fact_user_activity ua ON d.date_key = ua.date_key AND ua.is_active_day = TRUE
WHERE d.full_date BETWEEN CURRENT_DATE - 60 AND CURRENT_DATE
GROUP BY d.date_key, d.full_date, d.day_name, d.is_weekend
ORDER BY d.full_date;

-- ============================================================
-- STOREFRONT ANALYTICS
-- ============================================================

-- Store Performance Metrics
CREATE OR REPLACE VIEW bi_store_performance AS
SELECT 
    u.shop_name,
    u.city,
    SUM(sa.page_views) as total_views,
    SUM(sa.unique_visitors) as unique_visitors,
    SUM(sa.whatsapp_clicks) as whatsapp_clicks,
    SUM(sa.product_views) as product_views,
    SUM(sa.orders_initiated) as orders_initiated,
    ROUND(SUM(sa.whatsapp_clicks) * 100.0 / NULLIF(SUM(sa.page_views), 0), 2) as click_through_rate,
    ROUND(SUM(sa.orders_initiated) * 100.0 / NULLIF(SUM(sa.whatsapp_clicks), 0), 2) as conversion_rate
FROM dim_users u
JOIN fact_store_analytics sa ON u.user_key = sa.user_key
WHERE u.is_current = TRUE
GROUP BY u.user_key, u.shop_name, u.city
ORDER BY total_views DESC;

-- ============================================================
-- GEOGRAPHIC ANALYTICS
-- ============================================================

-- Regional Performance
CREATE OR REPLACE VIEW bi_regional_performance AS
SELECT 
    u.state,
    u.city,
    COUNT(DISTINCT u.user_key) as shop_count,
    COUNT(DISTINCT c.customer_key) as customer_count,
    SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as credit_volume,
    SUM(CASE WHEN t.transaction_type = 'payment' THEN t.amount ELSE 0 END) as payment_volume,
    AVG(t.amount) as avg_transaction
FROM dim_users u
LEFT JOIN dim_customers c ON u.user_key = c.user_key AND c.is_current = TRUE
LEFT JOIN fact_transactions t ON u.user_key = t.user_key
WHERE u.is_current = TRUE AND u.state IS NOT NULL
GROUP BY u.state, u.city
ORDER BY credit_volume DESC;

-- ============================================================
-- EXPORT QUERIES FOR REPORTING TOOLS
-- ============================================================

-- Weekly Executive Summary Export
CREATE OR REPLACE FUNCTION export_weekly_summary(p_week_start DATE)
RETURNS TABLE (
    metric_name VARCHAR,
    current_week DECIMAL,
    previous_week DECIMAL,
    wow_change_pct DECIMAL
) AS $$
DECLARE
    v_current_start DATE := p_week_start;
    v_current_end DATE := p_week_start + 6;
    v_prev_start DATE := p_week_start - 7;
    v_prev_end DATE := p_week_start - 1;
BEGIN
    RETURN QUERY
    WITH current_week AS (
        SELECT 
            COUNT(DISTINCT t.user_key) as active_shops,
            COUNT(DISTINCT t.customer_key) as active_customers,
            SUM(t.amount) as total_volume,
            COUNT(t.transaction_key) as total_txns
        FROM fact_transactions t
        JOIN dim_date d ON t.date_key = d.date_key
        WHERE d.full_date BETWEEN v_current_start AND v_current_end
    ),
    prev_week AS (
        SELECT 
            COUNT(DISTINCT t.user_key) as active_shops,
            COUNT(DISTINCT t.customer_key) as active_customers,
            SUM(t.amount) as total_volume,
            COUNT(t.transaction_key) as total_txns
        FROM fact_transactions t
        JOIN dim_date d ON t.date_key = d.date_key
        WHERE d.full_date BETWEEN v_prev_start AND v_prev_end
    )
    SELECT 'Active Shops'::VARCHAR, cw.active_shops::DECIMAL, pw.active_shops::DECIMAL,
           ROUND((cw.active_shops - pw.active_shops) * 100.0 / NULLIF(pw.active_shops, 0), 2)
    FROM current_week cw, prev_week pw
    UNION ALL
    SELECT 'Active Customers', cw.active_customers::DECIMAL, pw.active_customers::DECIMAL,
           ROUND((cw.active_customers - pw.active_customers) * 100.0 / NULLIF(pw.active_customers, 0), 2)
    FROM current_week cw, prev_week pw
    UNION ALL
    SELECT 'Total Volume', cw.total_volume, pw.total_volume,
           ROUND((cw.total_volume - pw.total_volume) * 100.0 / NULLIF(pw.total_volume, 0), 2)
    FROM current_week cw, prev_week pw
    UNION ALL
    SELECT 'Transactions', cw.total_txns::DECIMAL, pw.total_txns::DECIMAL,
           ROUND((cw.total_txns - pw.total_txns) * 100.0 / NULLIF(pw.total_txns, 0), 2)
    FROM current_week cw, prev_week pw;
END;
$$ LANGUAGE plpgsql;
