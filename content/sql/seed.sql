-- Deterministic sample data (no random()): every load gives identical rows.
INSERT INTO departments VALUES
  (1,'Engineering','New York'),(2,'QA','Austin'),(3,'Sales','London'),(4,'HR','Berlin'),(5,'Finance','London'),(6,'Legal','New York');

-- 27 employees: a CEO without a department, a 3-level reporting tree, salary ties (incl. a contested top salary in Sales),
-- two NULL salaries, an empty department (Legal), an orphaned manager_id (26) and someone who out-earns their manager (27).
INSERT INTO employees VALUES
  (1,'Avery Quinn','avery.quinn@corp.test',NULL,NULL,250000,'2015-03-02'),
  (2,'Blake Reed','blake.reed@corp.test',1,1,180000,'2016-07-11'),
  (3,'Casey Lin','casey.lin@corp.test',2,1,165000,'2016-09-05'),
  (4,'Devon Park','devon.park@corp.test',3,1,170000,'2017-01-16'),
  (5,'Emery Cole','emery.cole@corp.test',4,1,140000,'2017-05-22'),
  (6,'Finley Ross','finley.ross@corp.test',5,1,155000,'2018-02-12'),
  (7,'Gray Hart','gray.hart@corp.test',1,2,150000,'2018-08-01'),
  (8,'Harper Doyle','harper.doyle@corp.test',1,2,150000,'2019-03-18'),
  (9,'Indigo Shaw','indigo.shaw@corp.test',1,7,120000,'2020-06-29'),
  (10,'Jules Ford','jules.ford@corp.test',1,7,125000,'2021-01-04'),
  (11,'Kai Moreno','kai.moreno@corp.test',2,3,110000,'2019-11-11'),
  (12,'Lane Wu','lane.wu@corp.test',2,3,110000,'2020-02-24'),
  (13,'Morgan Bell','morgan.bell@corp.test',2,11,95000,'2021-09-13'),
  (14,'Noor Khan','noor.khan@corp.test',2,11,98000,'2022-04-04'),
  (15,'Oakley Fox','oakley.fox@corp.test',3,4,105000,'2019-05-06'),
  (16,'Parker Lee','parker.lee@corp.test',3,4,99000,'2021-12-01'),
  (17,'Quinn Ray','quinn.ray@corp.test',3,15,87000,'2022-10-17'),
  (18,'Reese Gil','reese.gil@corp.test',4,5,88000,'2020-07-20'),
  (19,'Sage Holt','sage.holt@corp.test',4,18,NULL,'2023-02-06'),
  (20,'Tatum Vale','tatum.vale@corp.test',5,6,102000,'2019-09-30'),
  (21,'Uri Nash','uri.nash@corp.test',5,20,92000,'2022-01-10'),
  (22,'Vale Orr','vale.orr@corp.test',1,9,90000,'2023-05-15'),
  (23,'Wren Cho','wren.cho@corp.test',2,13,72000,'2023-08-28'),
  (24,'Xan Pike','xan.pike@corp.test',1,10,NULL,'2024-01-08'),
  (25,'Yara Tse','yara.tse@corp.test',3,4,170000,'2020-10-12'),
  (26,'Zed Moss','zed.moss@corp.test',1,99,95000,'2022-06-06'),
  (27,'Ari Lowe','ari.lowe@corp.test',2,11,125000,'2022-08-08');

-- 29 customers: duplicate e-mails (19, 20, 22), same-name look-alikes (3, 21, 22), gmail and malformed addresses, accents,
-- customers who never ordered (18-27), one with a single 2023 order (28) and one whose every order was cancelled (29).
INSERT INTO customers VALUES
  (1,'Ada Mercer','ada@mail.test','London','UK','2022-01-15'),
  (2,'Ben Okafor','ben@mail.test','Lagos','Nigeria','2022-02-03'),
  (3,'Cleo Marsh','cleo@mail.test','Paris','France','2022-03-19'),
  (4,'Dev Patel','dev@mail.test','Mumbai','India','2022-04-08'),
  (5,'Elin Berg','elin@mail.test','Oslo','Norway','2022-05-30'),
  (6,'Faye Chen','faye@mail.test','Singapore','Singapore','2022-07-12'),
  (7,'Gus Romero','gus@mail.test','Madrid','Spain','2022-08-21'),
  (8,'Hana Sato','hana@mail.test','Tokyo','Japan','2022-09-09'),
  (9,'Ivo Novak','ivo@mail.test','Prague','Czechia','2022-10-25'),
  (10,'Jo Kim','jo@mail.test','Seoul','South Korea','2022-11-14'),
  (11,'Kit Alvarez','kit@mail.test','Austin','USA','2023-01-06'),
  (12,'Lia Rossi','lia@mail.test','Rome','Italy','2023-02-17'),
  (13,'Max Weber','max@mail.test','Berlin','Germany','2023-03-28'),
  (14,'Nia Brown','nia@mail.test','London','UK','2023-05-02'),
  (15,'Omar Aziz','omar@mail.test','Cairo','Egypt','2023-06-18'),
  (16,'Pia Lund','pia@mail.test','Stockholm','Sweden','2023-08-01'),
  (17,'Raj Singh','raj@mail.test','Delhi','India','2023-09-23'),
  (18,'Sue Park','sue@mail.test','Seoul','South Korea','2023-11-11'),
  (19,'Tom Reid','cleo@mail.test','Paris','France','2024-01-20'),
  (20,'Una Cruz','dev@mail.test','Mumbai','India','2024-02-14'),
  (21,'Cleo Marsh','cleo.m@mail.test','Paris','France','2023-12-01'),
  (22,'Cleo Marsh','cleo@mail.test','Paris','France','2022-03-19'),
  (23,'Dana Fitz','dana@gmail.com','Dublin','Ireland','2024-03-03'),
  (24,'Evan Gray','evan.g@gmail.com','Boston','USA','2024-03-10'),
  (25,'Fay Nolan','fay.nolan.test','Austin','USA','2024-04-01'),
  (26,'Gil Nodot','gil@nodot','Austin','USA','2024-04-02'),
  (27,'Zoë Müller','zoe@mail.test','Zürich','Switzerland','2024-05-05'),
  (28,'Hal Single','hal@mail.test','Leeds','UK','2023-03-15'),
  (29,'Ivy Cancel','ivy@mail.test','Bath','UK','2023-12-20');

-- 20 products (12 and 13-20 are never sold), tags are comma-separated on purpose; includes a duplicated name (3, 13),
-- 'sale' vs 'wholesale' tags, a name with a percent sign and code-like names.
INSERT INTO products VALUES
  (1,'Wireless Mouse','Electronics',24.99,'wireless,bluetooth,office'),
  (2,'Mechanical Keyboard','Electronics',89.00,'wired,rgb,office'),
  (3,'USB-C Hub','Electronics',39.50,'usb,office,travel'),
  (4,'Noise Cancelling Headphones','Electronics',199.00,'wireless,bluetooth,audio'),
  (5,'Data Science Handbook','Books',45.00,'python,data,learning'),
  (6,'SQL Patterns','Books',39.00,'sql,data,learning'),
  (7,'Desk Lamp','Home',29.90,'office,lighting'),
  (8,'Standing Desk','Home',420.00,'office,ergonomic'),
  (9,'Travel Mug','Home',15.00,'travel,kitchen'),
  (10,'Building Blocks','Toys',34.00,'kids,learning'),
  (11,'Puzzle 1000','Toys',19.50,'kids,puzzle'),
  (12,'Retro Console','Electronics',129.00,'gaming,retro'),
  (13,'USB-C Hub','Electronics',41.00,'usb,office'),
  (14,'Clearance Mug','Home',9.00,'sale,kitchen'),
  (15,'Bulk Pens','Home',12.00,'wholesale,office'),
  (16,'Pro Webcam','Electronics',79.00,'office,video'),
  (17,'Atlas','Books',25.00,'maps,learning'),
  (18,'100% Cotton Tee','Home',18.00,'clothing'),
  (19,'ABC-123','Toys',5.00,'code'),
  (20,'XYZ-007','Toys',6.00,'code');

-- 60 generated orders over 2023-2024, four statuses, customers 1-17 only; some repeated amounts (ties).
INSERT INTO orders
SELECT i,
       (i * 7) % 17 + 1,
       DATE '2023-01-01' + (i * 11) % 640,
       (ARRAY['placed','shipped','delivered','cancelled'])[i % 4 + 1],
       20 + (i * 37) % 480
FROM generate_series(1, 60) AS i;

-- Gaps in the id sequence (7, 8, 21, 33-35) so missing-id questions have something to find.
DELETE FROM orders WHERE order_id IN (7, 8, 21, 33, 34, 35);

-- Hand-placed rows: accidental double-submissions (61, 62), customers 1-3 ordering in consecutive months of 2024,
-- a big spender (4), an order whose customer does not exist (73), a customer with one old order (28), one whose
-- orders were all cancelled (29), and three orders relative to today so "last 30 days" questions have rows.
INSERT INTO orders SELECT 61, customer_id, order_date, status, amount FROM orders WHERE order_id = 5;
INSERT INTO orders SELECT 62, customer_id, order_date, status, amount FROM orders WHERE order_id = 9;
INSERT INTO orders VALUES
  (63,1,'2024-01-15','delivered',120),(64,1,'2024-02-10','delivered',95),(65,1,'2024-03-12','shipped',210),
  (66,2,'2024-01-20','delivered',75),(67,2,'2024-02-14','delivered',60),
  (68,3,'2024-01-05','placed',300),(69,3,'2024-02-25','delivered',45),
  (70,4,'2024-05-01','delivered',650),(71,4,'2024-05-20','delivered',700),(72,4,'2024-06-11','delivered',820),
  (73,99,'2024-02-02','placed',50),
  (74,28,'2023-04-04','delivered',33),
  (75,29,'2024-01-09','cancelled',44),(76,29,'2024-02-19','cancelled',61);
INSERT INTO orders VALUES
  (77,5,CURRENT_DATE - 3,'placed',89),(78,6,CURRENT_DATE - 10,'shipped',140),(79,7,CURRENT_DATE - 25,'delivered',64);

-- 1-3 items per order.
INSERT INTO order_items
SELECT row_number() OVER (ORDER BY o.order_id, k),
       o.order_id,
       (o.order_id * 3 + k * 5) % 11 + 1,
       k % 3 + 1,
       p.price
FROM orders o
CROSS JOIN generate_series(1, 3) AS k
JOIN products p ON p.product_id = (o.order_id * 3 + k * 5) % 11 + 1
WHERE k <= o.order_id % 3 + 1;

-- 300 sales rows over twelve months (Jul 2023 - Jun 2024) with several rows on some days; four regions, repeated amounts.
INSERT INTO sales
SELECT i, i % 11 + 1, (ARRAY['North','South','East','West'])[i % 4 + 1],
       DATE '2023-07-01' + i * 3 / 2, 10 + (i * 13) % 90, i % 5 + 1
FROM generate_series(1, 240) AS i;
INSERT INTO sales
SELECT 240 + j, (j * 5) % 11 + 1, (ARRAY['North','South','East','West'])[j % 4 + 1],
       DATE '2023-07-01' + j * 6, 15 + (j * 7) % 60, j % 4 + 1
FROM generate_series(1, 60) AS j;
-- Products 1 and 2 also sold in 2022 (so they sold in 2022, 2023 and 2024).
INSERT INTO sales VALUES
  (301,1,'North','2022-06-15',55,2),(302,2,'South','2022-09-09',40,1),(303,1,'East','2022-11-20',33,3),(304,2,'West','2022-12-30',28,1);

-- 400 page views from 15 users: several per session, with gaps that start new sessions.
INSERT INTO page_views
SELECT i,
       i % 15 + 1,
       (ARRAY['/home','/pricing','/docs','/blog','/signup','/checkout'])[i % 6 + 1],
       TIMESTAMP '2024-03-01 08:00:00' + (i * 7 + (i / 9) * 45) * INTERVAL '1 minute',
       's' || (i % 15 + 1) || '-' || i / 9
FROM generate_series(1, 400) AS i;

-- Logins for users 1-8: streaks and gaps (a user skips every n-th day).
INSERT INTO logins
SELECT row_number() OVER (ORDER BY u, d), u, DATE '2024-04-01' + d
FROM generate_series(1, 8) AS u
CROSS JOIN generate_series(0, 39) AS d
WHERE (d + u) % (u + 2) <> 0;

INSERT INTO logins
SELECT 1000 + row_number() OVER (ORDER BY d), 9, d
FROM (VALUES (DATE '2024-01-05'), (DATE '2024-01-06'), (DATE '2024-05-15'), (DATE '2024-05-16')) AS v(d);
INSERT INTO logins SELECT 1100 + n, 10, CURRENT_DATE - n FROM generate_series(1, 5) AS n;

-- SCD Type 2 history: customers 1-8 each have a current row; customers 2, 4 and 6 also have an earlier city.
INSERT INTO customer_dim VALUES
  (1,1,'Ada Mercer','London','2022-01-15','9999-12-31',TRUE),
  (2,2,'Ben Okafor','Abuja','2022-02-03','2023-05-31',FALSE),
  (3,2,'Ben Okafor','Lagos','2023-06-01','9999-12-31',TRUE),
  (4,3,'Cleo Marsh','Paris','2022-03-19','9999-12-31',TRUE),
  (5,4,'Dev Patel','Pune','2022-04-08','2023-02-28',FALSE),
  (6,4,'Dev Patel','Mumbai','2023-03-01','9999-12-31',TRUE),
  (7,5,'Elin Berg','Oslo','2022-05-30','9999-12-31',TRUE),
  (8,6,'Faye Chen','Kuala Lumpur','2022-07-12','2023-09-30',FALSE),
  (9,6,'Faye Chen','Singapore','2023-10-01','9999-12-31',TRUE),
  (10,7,'Gus Romero','Madrid','2022-08-21','9999-12-31',TRUE),
  (11,8,'Hana Sato','Tokyo','2022-09-09','9999-12-31',TRUE);

-- Today's landing copy: customer 3 moved city, customer 8 was dropped, customers 21-22 are new.
INSERT INTO customers_stg VALUES
  (1,'Ada Mercer','ada@mail.test','London','UK'),
  (2,'Ben Okafor','ben@mail.test','Lagos','Nigeria'),
  (3,'Cleo Marsh','cleo@mail.test','Lyon','France'),
  (4,'Dev Patel','dev@mail.test','Mumbai','India'),
  (5,'Elin Berg','elin@mail.test','Oslo','Norway'),
  (6,'Faye Chen','faye@mail.test','Singapore','Singapore'),
  (7,'Gus Romero','gus@mail.test','Madrid','Spain'),
  (21,'Vic Lang','vic@mail.test','Dublin','Ireland'),
  (22,'Wes Hall','wes@mail.test','Boston','USA');

-- Subscription intervals: overlaps, back-to-back plans, gaps and open-ended rows (NULL end_date).
INSERT INTO subscriptions VALUES
  (1,1,'basic','2024-01-01','2024-03-31'),
  (2,1,'pro','2024-03-15','2024-06-30'),
  (3,1,'pro','2024-08-01',NULL),
  (4,2,'basic','2024-01-10','2024-02-10'),
  (5,2,'basic','2024-02-11','2024-04-30'),
  (6,3,'pro','2023-11-01','2024-01-31'),
  (7,3,'team','2024-02-01','2024-02-29'),
  (8,3,'team','2024-05-01','2024-07-31'),
  (9,4,'basic','2024-02-01',NULL),
  (10,4,'pro','2024-04-01','2024-05-31'),
  (11,5,'pro','2024-01-01','2024-12-31'),
  (12,6,'basic','2024-03-01','2024-03-31'),
  (13,6,'basic','2024-03-20','2024-04-20'),
  (14,7,'team','2024-06-01','2024-09-30'),
  (15,8,'basic','2024-01-01','2024-01-31'),
  (16,8,'pro','2024-02-15',NULL),
  (17,9,'basic','2024-01-01','2024-02-01'),
  (18,9,'pro','2024-02-01','2024-06-30');

-- Two same-shaped yearly tables that overlap on products 5-8.
INSERT INTO sales_2023
SELECT i % 8 + 1, (ARRAY['North','South','East','West'])[i % 4 + 1], DATE '2023-01-01' + i * 7 % 360, 20 + (i * 17) % 80
FROM generate_series(1, 40) AS i;
INSERT INTO sales_2024
SELECT i % 8 + 5, (ARRAY['North','South','East','West'])[i % 4 + 1], DATE '2024-01-01' + i * 7 % 360, 20 + (i * 19) % 80
FROM generate_series(1, 40) AS i;
