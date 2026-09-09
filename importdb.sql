-- Procurement Monitoring System - Database
-- Import via phpMyAdmin or: mysql -u root < importdb.sql
--
-- Creates: offices (with fund_allocation), users, requests, status_logs, documents
-- Seeds:   5 system offices with sample fund allocations, 5 login accounts, sample tracking PR-0001–PR-0006, and six months of mock Lipa Campus requests

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
  request_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  funding_office VARCHAR(30) DEFAULT NULL,
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

-- Request-specific signatory workflow (monitoring only; no digital signatures)
CREATE TABLE IF NOT EXISTS request_signatories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  signatory_name VARCHAR(150) NOT NULL,
  designation VARCHAR(150) DEFAULT NULL,
  document_location VARCHAR(255) DEFAULT NULL,
  assigned_office VARCHAR(30) DEFAULT NULL,
  approval_order INT NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending Signature',
  signed_at TIMESTAMP NULL DEFAULT NULL,
  updated_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  INDEX idx_request_signatories_order (request_id, approval_order, id)
) ENGINE=InnoDB;

-- Signatory monitoring history (no digital signatures are stored)
CREATE TABLE IF NOT EXISTS request_signatory_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  signatory_id INT DEFAULT NULL,
  assigned_office VARCHAR(30) DEFAULT NULL,
  action VARCHAR(30) NOT NULL,
  status VARCHAR(30) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  updated_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  INDEX idx_signatory_logs_request (request_id, created_at, id)
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
(5, 'PO', 'Procurement Office', 'Purchase order issued'),
(5, 'DV Processing', 'Accounting Office', 'Disbursement voucher in process'),
(5, 'For Payment', 'Accounting Office', 'Ready for payment monitoring'),
(5, 'Paid', 'Cashier', 'Marked as paid (monitoring)'),
(5, 'Completed', 'Cashier', 'Transaction finished'),
(6, 'Registered', 'system', NULL),
(6, 'Under Budget Review', 'Budget Office', NULL),
(6, 'Reviewed', 'Budget Office', NULL),
(6, 'Canvass', 'Procurement Office', NULL),
(6, 'PO', 'Procurement Office', 'Purchase order issued'),
(6, 'DV Processing', 'Accounting Office', NULL),
(6, 'For Payment', 'Accounting Office', 'Awaiting cashier handoff');

UPDATE requests SET bur = 'BUR-2024-001', ors = 'ORS-2024-050', budget_type = 'MOOE' WHERE tracking_number = 'PR-0003';
UPDATE requests SET bur = 'BUR-2024-002', ors = 'ORS-2024-051', budget_type = 'Capital Outlay' WHERE tracking_number = 'PR-0004';
UPDATE requests SET bur = 'BUR-2024-003', ors = 'ORS-2024-052', budget_type = 'MOOE' WHERE tracking_number = 'PR-0005';
UPDATE requests SET bur = 'BUR-2024-004', ors = 'ORS-2024-053', budget_type = 'MOOE' WHERE tracking_number = 'PR-0006';

-- Six months of mock BatStateU Lipa Campus transactions (March-August 2026)
-- Program references use established degree-program names; amounts, dates, and statuses are fictional test data.
INSERT INTO requests
  (tracking_number, title, description, request_amount, funding_office, bur, ors, budget_type, status, notes, updated_by, created_at, updated_at)
VALUES
('PR-M2601', 'BS Information Technology Laboratory Network Upgrade', 'Network switches, access points, and cabling for information technology laboratory activities.', 285000.00, 'requesting', 'BUR-2026-031', 'ORS-2026-101', 'MOOE', 'Completed', 'Mock completed transaction.', 'Cashier', '2026-03-05 09:00:00', '2026-04-09 15:30:00'),
('PR-M2602', 'BS Civil Engineering Surveying Instruments', 'Surveying instruments and field accessories for civil engineering laboratory and fieldwork.', 438500.00, 'requesting', 'BUR-2026-032', 'ORS-2026-102', 'Capital Outlay', 'For Inspection', 'Mock transaction awaiting inspection.', 'PSO', '2026-03-18 10:15:00', '2026-04-02 14:00:00'),
('PR-A2601', 'BS Computer Science Development Workstations', 'Desktop workstations and peripherals for computer science programming and software development activities.', 612000.00, 'requesting', 'BUR-2026-041', 'ORS-2026-111', 'Capital Outlay', 'Canvass', 'Mock canvassing transaction.', 'Procurement Office', '2026-04-02 08:45:00', '2026-04-10 11:20:00'),
('PR-A2602', 'BS Electrical Engineering Test Equipment', 'Digital multimeters, oscilloscopes, and regulated power supplies for electrical engineering laboratories.', 357750.00, 'requesting', 'BUR-2026-042', 'ORS-2026-112', 'Capital Outlay', 'Completed', 'Mock completed transaction.', 'Cashier', '2026-04-21 13:10:00', '2026-05-27 16:00:00'),
('PR-M2603', 'BS Mechanical Engineering Machine Shop Tools', 'Machine shop tools, measuring instruments, and safety equipment for mechanical engineering instruction.', 524300.00, 'requesting', 'BUR-2026-051', 'ORS-2026-121', 'Capital Outlay', 'DV Processing', 'Mock disbursement voucher monitoring.', 'Accounting Office', '2026-05-06 09:30:00', '2026-06-04 10:00:00'),
('PR-M2604', 'BS Accountancy Instructional Materials', 'Accounting textbooks, practice sets, and instructional materials for accountancy courses.', 96500.00, 'requesting', 'BUR-2026-052', 'ORS-2026-122', 'MOOE', 'Reviewed', 'Mock budget-reviewed transaction.', 'Budget Office', '2026-05-19 11:00:00', '2026-05-25 09:15:00'),
('PR-J2601', 'BS Business Administration Entrepreneurship Supplies', 'Training materials and workshop supplies for business administration entrepreneurship activities.', 142800.00, 'requesting', 'BUR-2026-061', 'ORS-2026-131', 'MOOE', 'PO', 'Mock purchase order monitoring.', 'Procurement Office', '2026-06-03 08:30:00', '2026-06-18 14:45:00'),
('PR-J2602', 'BS Information Technology Server Room Cooling', 'Dedicated cooling equipment and monitoring devices for the information technology server room.', 198400.00, 'requesting', 'BUR-2026-062', 'ORS-2026-132', 'Capital Outlay', 'Paid', 'Mock paid transaction awaiting final completion marking.', 'Cashier', '2026-06-24 10:40:00', '2026-07-31 13:00:00'),
('PR-J2603', 'BS Civil Engineering Materials Testing Supplies', 'Concrete, aggregate, and materials testing consumables for civil engineering laboratory exercises.', 176250.00, 'requesting', NULL, NULL, NULL, 'Under Budget Review', 'Mock request under budget review.', 'Budget Office', '2026-07-08 09:05:00', '2026-07-10 10:30:00'),
('PR-J2604', 'BS Electrical Engineering Renewable Energy Trainer', 'Renewable energy training equipment and laboratory accessories for electrical engineering activities.', 486900.00, 'requesting', 'BUR-2026-072', 'ORS-2026-142', 'Capital Outlay', 'Accepted', 'Mock transaction accepted by PSO.', 'PSO', '2026-07-22 14:20:00', '2026-08-20 15:10:00'),
('PR-A2603', 'BS Mechanical Engineering Computer-Aided Design Licenses', 'Temporary software licenses and training resources for mechanical engineering design activities.', 219600.00, 'requesting', 'BUR-2026-081', 'ORS-2026-151', 'MOOE', 'Canvass', 'Mock canvassing transaction.', 'Procurement Office', '2026-08-05 08:50:00', '2026-08-13 11:00:00'),
('PR-A2604', 'BS Computer Science Student Project Equipment', 'Microcontroller kits, sensors, and project components for computer science student development activities.', 118750.00, 'requesting', NULL, NULL, NULL, 'Registered', 'Mock newly registered request.', 'Requesting Office', '2026-08-26 10:25:00', '2026-08-26 10:25:00');

-- Reduce available funds for the fictional mock requests above.
UPDATE offices o
SET fund_allocation = GREATEST(
  0,
  fund_allocation - COALESCE((
    SELECT SUM(r.request_amount)
    FROM requests r
    WHERE r.funding_office = o.slug
      AND r.tracking_number REGEXP '^PR-[MAJ]26[0-9]+$'
  ), 0)
);

CREATE TABLE IF NOT EXISTS system_migrations (
  migration_key VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
INSERT IGNORE INTO system_migrations (migration_key) VALUES ('reconcile_request_funds');

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', '2026-03-05 09:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review started.', '2026-03-06 10:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock budget review completed.', '2026-03-10 14:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing started.', '2026-03-12 09:30:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'PO', 'Procurement Office', 'Mock purchase order issued.', '2026-03-18 15:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Delivered', 'PSO', 'Mock delivery received.', '2026-03-25 10:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Inspection', 'PSO', 'Mock inspection started.', '2026-03-27 13:30:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Accepted', 'PSO', 'Mock inspection accepted.', '2026-04-01 09:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'DV Processing', 'Accounting Office', 'Mock disbursement voucher processing.', '2026-04-03 11:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Payment', 'Accounting Office', 'Mock payment handoff.', '2026-04-05 14:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Paid', 'Cashier', 'Mock payment recorded.', '2026-04-08 10:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Completed', 'Cashier', 'Mock transaction completed.', '2026-04-09 15:30:00' FROM requests WHERE tracking_number = 'PR-M2601';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', '2026-03-18 10:15:00' FROM requests WHERE tracking_number = 'PR-M2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-03-20 09:00:00' FROM requests WHERE tracking_number = 'PR-M2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-03-24 13:00:00' FROM requests WHERE tracking_number = 'PR-M2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing completed.', '2026-03-28 10:00:00' FROM requests WHERE tracking_number = 'PR-M2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'PO', 'Procurement Office', 'Mock purchase order issued.', '2026-03-30 15:00:00' FROM requests WHERE tracking_number = 'PR-M2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Delivered', 'PSO', 'Mock delivery received.', '2026-04-01 11:00:00' FROM requests WHERE tracking_number = 'PR-M2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Inspection', 'PSO', 'Mock inspection pending completion.', '2026-04-02 14:00:00' FROM requests WHERE tracking_number = 'PR-M2602';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-A2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-04-05 10:00:00' FROM requests WHERE tracking_number = 'PR-A2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-04-07 14:00:00' FROM requests WHERE tracking_number = 'PR-A2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing in progress.', '2026-04-10 11:20:00' FROM requests WHERE tracking_number = 'PR-A2601';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', '2026-04-21 13:10:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-04-23 09:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-04-27 15:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing completed.', '2026-04-30 10:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'PO', 'Procurement Office', 'Mock purchase order issued.', '2026-05-04 14:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Delivered', 'PSO', 'Mock delivery received.', '2026-05-12 09:30:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Inspection', 'PSO', 'Mock inspection completed.', '2026-05-15 13:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Accepted', 'PSO', 'Mock inspection accepted.', '2026-05-18 10:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'DV Processing', 'Accounting Office', 'Mock disbursement voucher processing.', '2026-05-20 11:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Payment', 'Accounting Office', 'Mock payment handoff.', '2026-05-22 14:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Paid', 'Cashier', 'Mock payment recorded.', '2026-05-25 10:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Completed', 'Cashier', 'Mock transaction completed.', '2026-05-27 16:00:00' FROM requests WHERE tracking_number = 'PR-A2602';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-05-08 10:00:00' FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-05-12 14:00:00' FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing completed.', '2026-05-18 09:00:00' FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'PO', 'Procurement Office', 'Mock purchase order issued.', '2026-05-22 15:00:00' FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Delivered', 'PSO', 'Mock delivery received.', '2026-05-28 10:00:00' FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Inspection', 'PSO', 'Mock inspection completed.', '2026-06-01 13:00:00' FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Accepted', 'PSO', 'Mock inspection accepted.', '2026-06-02 09:00:00' FROM requests WHERE tracking_number = 'PR-M2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'DV Processing', 'Accounting Office', 'Mock disbursement voucher in process.', '2026-06-04 10:00:00' FROM requests WHERE tracking_number = 'PR-M2603';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-M2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-05-21 09:00:00' FROM requests WHERE tracking_number = 'PR-M2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-05-25 13:00:00' FROM requests WHERE tracking_number = 'PR-M2604';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-J2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-06-05 10:00:00' FROM requests WHERE tracking_number = 'PR-J2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-06-09 14:00:00' FROM requests WHERE tracking_number = 'PR-J2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing completed.', '2026-06-12 11:00:00' FROM requests WHERE tracking_number = 'PR-J2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'PO', 'Procurement Office', 'Mock purchase order issued.', '2026-06-18 14:45:00' FROM requests WHERE tracking_number = 'PR-J2601';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-J2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-06-26 09:00:00' FROM requests WHERE tracking_number = 'PR-J2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-06-30 14:00:00' FROM requests WHERE tracking_number = 'PR-J2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing completed.', '2026-07-03 10:00:00' FROM requests WHERE tracking_number = 'PR-J2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'PO', 'Procurement Office', 'Mock purchase order issued.', '2026-07-08 15:00:00' FROM requests WHERE tracking_number = 'PR-J2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Delivered', 'PSO', 'Mock delivery received.', '2026-07-15 11:00:00' FROM requests WHERE tracking_number = 'PR-J2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Inspection', 'PSO', 'Mock inspection completed.', '2026-07-20 13:00:00' FROM requests WHERE tracking_number = 'PR-J2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Accepted', 'PSO', 'Mock transaction accepted.', '2026-08-20 15:10:00' FROM requests WHERE tracking_number = 'PR-J2602';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-J2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review in progress.', '2026-07-10 10:30:00' FROM requests WHERE tracking_number = 'PR-J2603';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-J2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-07-25 10:00:00' FROM requests WHERE tracking_number = 'PR-J2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-07-29 14:00:00' FROM requests WHERE tracking_number = 'PR-J2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing completed.', '2026-08-03 09:00:00' FROM requests WHERE tracking_number = 'PR-J2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'PO', 'Procurement Office', 'Mock purchase order issued.', '2026-08-07 15:00:00' FROM requests WHERE tracking_number = 'PR-J2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Delivered', 'PSO', 'Mock delivery received.', '2026-08-12 10:00:00' FROM requests WHERE tracking_number = 'PR-J2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'For Inspection', 'PSO', 'Mock inspection completed.', '2026-08-15 13:00:00' FROM requests WHERE tracking_number = 'PR-J2604';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Accepted', 'PSO', 'Mock transaction accepted.', '2026-08-20 15:10:00' FROM requests WHERE tracking_number = 'PR-J2604';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock request recorded.', created_at FROM requests WHERE tracking_number = 'PR-A2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Under Budget Review', 'Budget Office', 'Mock budget review completed.', '2026-08-07 10:00:00' FROM requests WHERE tracking_number = 'PR-A2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Reviewed', 'Budget Office', 'Mock request reviewed.', '2026-08-10 14:00:00' FROM requests WHERE tracking_number = 'PR-A2603';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Canvass', 'Procurement Office', 'Mock canvassing in progress.', '2026-08-13 11:00:00' FROM requests WHERE tracking_number = 'PR-A2603';

INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
SELECT id, 'Registered', 'Requesting Office', 'Mock newly registered request.', created_at FROM requests WHERE tracking_number = 'PR-A2604';
