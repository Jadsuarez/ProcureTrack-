-- Procurement Monitoring System - Database
-- Import via phpMyAdmin or: mysql -u root < importdb.sql
--
-- Creates: offices (with fund_allocation), users, requests, status_logs, documents
-- Seeds:   5 system offices with sample fund allocations, 5 login accounts, sample tracking PR-0001–PR-0006

CREATE DATABASE IF NOT EXISTS procurement_monitoring
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE procurement_monitoring;

-- Office registry (assignable roles for user accounts)
CREATE TABLE IF NOT EXISTS offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  fund_allocation DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO offices (slug, label, is_system, created_by, fund_allocation) VALUES
('requesting', 'Requesting Office', 1, 'system', 5000000.00),
('budget', 'Budget Office', 1, 'system', 250000.00),
('procurement', 'Procurement Office', 1, 'system', 1200000.00),
('accounting', 'Accounting Office', 1, 'system', 400000.00),
('cashier', 'Cashier', 1, 'system', 150000.00);

UPDATE offices SET fund_allocation = 5000000.00 WHERE slug = 'requesting' AND fund_allocation = 0;
UPDATE offices SET fund_allocation = 250000.00 WHERE slug = 'budget' AND fund_allocation = 0;
UPDATE offices SET fund_allocation = 1200000.00 WHERE slug = 'procurement' AND fund_allocation = 0;
UPDATE offices SET fund_allocation = 400000.00 WHERE slug = 'accounting' AND fund_allocation = 0;
UPDATE offices SET fund_allocation = 150000.00 WHERE slug = 'cashier' AND fund_allocation = 0;

-- User accounts (login credentials and office assignment)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  office VARCHAR(30) NOT NULL,
  created_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default accounts (passwords shown in howtorun.txt)
INSERT INTO users (username, password_hash, office, created_by) VALUES
('requesting_user', '$2y$10$tIPD0DYkgn16OwJKa.Mt8.WgLLdFhfkzng9HoGuXiL7pvPK.nwc8G', 'requesting', 'system'),
('budget_user', '$2y$10$tVchF91xzKgzG1T/eM3OnetLESLwliFYycU3jqGlu5/tRDPaI0YLK', 'budget', 'system'),
('procurement_user', '$2y$10$JPNmPLbP329e6OFwbv0Qour18/TsEsclGH.zWa.kYe0Phv973Jtbi', 'procurement', 'system'),
('accounting_user', '$2y$10$6hM6pG4eabnbzg.Xmndf7OuhbY4EWaP2OcF4XWylm00Otp9UDT8z2', 'accounting', 'system'),
('cashier_user', '$2y$10$GbVe3da3AKH37vecHjx/D.iJquKVZDrbWMMQiJnBFtnE8.GXlmwMe', 'cashier', 'system');

-- Main requests table (pre-seeded; no creation via UI)
CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_number VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  bur VARCHAR(100) DEFAULT NULL,
  ors VARCHAR(100) DEFAULT NULL,
  budget_type VARCHAR(100) DEFAULT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  status VARCHAR(100) NOT NULL DEFAULT 'Registered',
  notes TEXT DEFAULT NULL,
  updated_by VARCHAR(50) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Status history for timeline display
CREATE TABLE IF NOT EXISTS status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  status VARCHAR(100) NOT NULL,
  notes TEXT DEFAULT NULL,
  updated_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Document attachments (multiple files per request)
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_by VARCHAR(50) DEFAULT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Sample pre-existing requests (monitoring only — created in DB, not via UI)
INSERT INTO requests (tracking_number, title, description, status, updated_by) VALUES
('PR-0001', 'Office Supplies Q1', 'Paper, pens, and folders for admin office', 'Registered', 'system'),
('PR-0002', 'IT Equipment', 'Laptops and peripherals for IT department', 'Under Budget Review', 'budget'),
('PR-0003', 'Training Materials', 'Books and modules for staff development', 'Reviewed', 'budget'),
('PR-0004', 'Furniture Purchase', 'Desks and chairs for new wing', 'Canvass', 'procurement'),
('PR-0005', 'Vehicle Maintenance', 'Annual fleet service contract', 'Completed', 'Cashier'),
('PR-0006', 'Laboratory Supplies', 'Reagents and consumables for science lab', 'For Payment', 'Accounting Office');

INSERT INTO status_logs (request_id, status, updated_by, notes) VALUES
(1, 'Registered', 'system', 'Request recorded in system'),
(2, 'Registered', 'system', NULL),
(2, 'Under Budget Review', 'budget', 'Forwarded to Budget Office'),
(3, 'Registered', 'system', NULL),
(3, 'Under Budget Review', 'budget', NULL),
(3, 'Reviewed', 'budget', 'Budget review complete'),
(4, 'Registered', 'system', NULL),
(4, 'Under Budget Review', 'budget', NULL),
(4, 'Reviewed', 'budget', NULL),
(4, 'Canvass', 'procurement', 'Canvassing started'),
(5, 'Registered', 'system', NULL),
(5, 'Under Budget Review', 'budget', NULL),
(5, 'Reviewed', 'budget', NULL),
(5, 'Canvass', 'procurement', NULL),
(5, 'Abstract of Canvass', 'procurement', NULL),
(5, 'PO', 'Procurement Office', 'Purchase order issued'),
(5, 'DV Processing', 'Accounting Office', 'Disbursement voucher in process'),
(5, 'For Payment', 'Accounting Office', 'Ready for payment monitoring'),
(5, 'Paid', 'Cashier', 'Marked as paid (monitoring)'),
(5, 'Completed', 'Cashier', 'Transaction finished'),
(6, 'Registered', 'system', NULL),
(6, 'Under Budget Review', 'Budget Office', NULL),
(6, 'Reviewed', 'Budget Office', NULL),
(6, 'Canvass', 'Procurement Office', NULL),
(6, 'Abstract of Canvass', 'Procurement Office', NULL),
(6, 'PO', 'Procurement Office', 'Purchase order issued'),
(6, 'DV Processing', 'Accounting Office', NULL),
(6, 'For Payment', 'Accounting Office', 'Awaiting cashier handoff');

UPDATE requests SET bur = 'BUR-2024-001', ors = 'ORS-2024-050', budget_type = 'MOOE' WHERE tracking_number = 'PR-0003';
UPDATE requests SET bur = 'BUR-2024-002', ors = 'ORS-2024-051', budget_type = 'Capital Outlay' WHERE tracking_number = 'PR-0004';
UPDATE requests SET bur = 'BUR-2024-003', ors = 'ORS-2024-052', budget_type = 'MOOE' WHERE tracking_number = 'PR-0005';
UPDATE requests SET bur = 'BUR-2024-004', ors = 'ORS-2024-053', budget_type = 'MOOE' WHERE tracking_number = 'PR-0006';
