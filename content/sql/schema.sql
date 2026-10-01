-- Shared schema for the SQL practice questions (PostgreSQL). Column lists mirror content/sql/schema.json.
CREATE TABLE departments  (dept_id INT PRIMARY KEY, dept_name VARCHAR(50), location VARCHAR(50));
CREATE TABLE employees    (emp_id INT PRIMARY KEY, emp_name VARCHAR(80), email VARCHAR(120), dept_id INT, manager_id INT, salary DECIMAL(12,2), hire_date DATE);
CREATE TABLE customers    (customer_id INT PRIMARY KEY, customer_name VARCHAR(80), email VARCHAR(120), city VARCHAR(50), country VARCHAR(50), signup_date DATE);
CREATE TABLE products     (product_id INT PRIMARY KEY, product_name VARCHAR(80), category VARCHAR(50), price DECIMAL(10,2), tags VARCHAR(200));
CREATE TABLE orders       (order_id INT PRIMARY KEY, customer_id INT, order_date DATE, status VARCHAR(20), amount DECIMAL(12,2));
CREATE TABLE order_items  (order_item_id INT PRIMARY KEY, order_id INT, product_id INT, quantity INT, unit_price DECIMAL(10,2));
CREATE TABLE sales        (sale_id INT PRIMARY KEY, product_id INT, region VARCHAR(30), sale_date DATE, amount DECIMAL(12,2), quantity INT);
CREATE TABLE page_views   (view_id BIGINT PRIMARY KEY, user_id INT, page VARCHAR(60), view_ts TIMESTAMP, session_id VARCHAR(40));
CREATE TABLE logins       (login_id INT PRIMARY KEY, user_id INT, login_date DATE);
CREATE TABLE customer_dim (cust_key INT PRIMARY KEY, customer_id INT, customer_name VARCHAR(80), city VARCHAR(50), start_date DATE, end_date DATE, is_current BOOLEAN);
CREATE TABLE customers_stg(customer_id INT, customer_name VARCHAR(80), email VARCHAR(120), city VARCHAR(50), country VARCHAR(50));
CREATE TABLE subscriptions(subscription_id INT PRIMARY KEY, customer_id INT, plan VARCHAR(30), start_date DATE, end_date DATE);
CREATE TABLE sales_2023   (product_id INT, region VARCHAR(30), sale_date DATE, amount DECIMAL(12,2));
CREATE TABLE sales_2024   (product_id INT, region VARCHAR(30), sale_date DATE, amount DECIMAL(12,2));
