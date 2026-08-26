-- Procurement Monitoring System - Database
-- Import via phpMyAdmin or: mysql -u root < importdb.sql
--
-- Creates: offices, users, requests, status_logs, documents
-- Seeds:   6 system offices, 6 login accounts, sample tracking PR-0001–PR-0007
--
-- OFFICES: requesting, budget, procurement, pso, accounting, cashier
--   pso = Property and Supply Office (PSO)
--
-- STATUS FLOW:
--   Registered → Under Budget Review → Reviewed
--   → Canvass → Abstract of Canvass → PO → For Bidding → Bidding Award
--   → Delivered → For Inspection → Accepted          (PSO)
--   → DV Processing → For Payment → Paid → Completed
--
-- DEFAULT LOGINS (see howtorun.txt):
--   pso_user / pso123  →  Property and Supply Office

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
  created_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO offices (slug, label, is_system, created_by) VALUES
('requesting', 'Requesting Office', 1, 'system'),
('budget', 'Budget Office', 1, 'system'),
('procurement', 'Procurement Office', 1, 'system'),
('pso', 'Property and Supply Office', 1, 'system'),
('accounting', 'Accounting Office', 1, 'system'),
('cashier', 'Cashier', 1, 'system');

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
INSERT IGNORE INTO users (username, password_hash, office, created_by) VALUES
('requesting_user', '$2y$10$tIPD0DYkgn16OwJKa.Mt8.WgLLdFhfkzng9HoGuXiL7pvPK.nwc8G', 'requesting', 'system'),
('budget_user', '$2y$10$tVchF91xzKgzG1T/eM3OnetLESLwliFYycU3jqGlu5/tRDPaI0YLK', 'budget', 'system'),
('procurement_user', '$2y$10$JPNmPLbP329e6OFwbv0Qour18/TsEsclGH.zWa.kYe0Phv973Jtbi', 'procurement', 'system'),
('pso_user', '$2y$10$JsFngouf3C0Mk.o2OtMEiuVmFL/LAwvnx81BK7CvHh.a.OrSr.xTa', 'pso', 'system'),
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
('PR-0006', 'Laboratory Supplies', 'Reagents and consumables for science lab', 'For Payment', 'Accounting Office'),
('PR-0007', 'Medical Equipment', 'Diagnostic tools for clinic', 'For Inspection', 'Property and Supply Office');

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
(5, 'For Bidding', 'procurement', NULL),
(5, 'Bidding Award', 'procurement', NULL),
(5, 'Delivered', 'Property and Supply Office', NULL),
(5, 'For Inspection', 'Property and Supply Office', NULL),
(5, 'Accepted', 'Property and Supply Office', NULL),
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
(6, 'For Bidding', 'Procurement Office', NULL),
(6, 'Bidding Award', 'Procurement Office', NULL),
(6, 'Delivered', 'Property and Supply Office', NULL),
(6, 'For Inspection', 'Property and Supply Office', NULL),
(6, 'Accepted', 'Property and Supply Office', NULL),
(6, 'DV Processing', 'Accounting Office', NULL),
(6, 'For Payment', 'Accounting Office', 'Awaiting cashier handoff'),
(7, 'Registered', 'system', NULL),
(7, 'Under Budget Review', 'Budget Office', NULL),
(7, 'Reviewed', 'Budget Office', NULL),
(7, 'Canvass', 'Procurement Office', NULL),
(7, 'Abstract of Canvass', 'Procurement Office', NULL),
(7, 'PO', 'Procurement Office', 'Purchase order issued'),
(7, 'For Bidding', 'Procurement Office', NULL),
(7, 'Bidding Award', 'Procurement Office', NULL),
(7, 'Delivered', 'Property and Supply Office', NULL),
(7, 'For Inspection', 'Property and Supply Office', 'Awaiting inspection');

UPDATE requests SET bur = 'BUR-2024-001', ors = 'ORS-2024-050', budget_type = 'MOOE' WHERE tracking_number = 'PR-0003';
UPDATE requests SET bur = 'BUR-2024-002', ors = 'ORS-2024-051', budget_type = 'Capital Outlay' WHERE tracking_number = 'PR-0004';
UPDATE requests SET bur = 'BUR-2024-003', ors = 'ORS-2024-052', budget_type = 'MOOE' WHERE tracking_number = 'PR-0005';
UPDATE requests SET bur = 'BUR-2024-004', ors = 'ORS-2024-053', budget_type = 'MOOE' WHERE tracking_number = 'PR-0006';
UPDATE requests SET bur = 'BUR-2024-005', ors = 'ORS-2024-054', budget_type = 'Capital Outlay' WHERE tracking_number = 'PR-0007';

-- ---------------------------------------------------------------------------
-- EXISTING DATABASE — safe add-on (run this block only if you already imported
-- an older importdb.sql and need PSO + sample PR-0007 without full re-import)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO offices (slug, label, is_system, created_by) VALUES
('pso', 'Property and Supply Office', 1, 'system');

INSERT IGNORE INTO users (username, password_hash, office, created_by) VALUES
('pso_user', '$2y$10$JsFngouf3C0Mk.o2OtMEiuVmFL/LAwvnx81BK7CvHh.a.OrSr.xTa', 'pso', 'system');

INSERT IGNORE INTO requests (tracking_number, title, description, status, updated_by) VALUES
('PR-0007', 'Medical Equipment', 'Diagnostic tools for clinic', 'For Inspection', 'Property and Supply Office');

INSERT INTO status_logs (request_id, status, updated_by, notes)
SELECT r.id, v.status, v.updated_by, v.notes
FROM requests r
CROSS JOIN (
  SELECT 'Registered' AS status, 'system' AS updated_by, NULL AS notes UNION ALL
  SELECT 'Under Budget Review', 'Budget Office', NULL UNION ALL
  SELECT 'Reviewed', 'Budget Office', NULL UNION ALL
  SELECT 'Canvass', 'Procurement Office', NULL UNION ALL
  SELECT 'Abstract of Canvass', 'Procurement Office', NULL UNION ALL
  SELECT 'PO', 'Procurement Office', 'Purchase order issued' UNION ALL
  SELECT 'For Bidding', 'Procurement Office', NULL UNION ALL
  SELECT 'Bidding Award', 'Procurement Office', NULL UNION ALL
  SELECT 'Delivered', 'Property and Supply Office', NULL UNION ALL
  SELECT 'For Inspection', 'Property and Supply Office', 'Awaiting inspection'
) v
WHERE r.tracking_number = 'PR-0007'
  AND NOT EXISTS (
    SELECT 1 FROM status_logs sl
    WHERE sl.request_id = r.id AND sl.status = v.status
  );

UPDATE requests SET bur = 'BUR-2024-005', ors = 'ORS-2024-054', budget_type = 'Capital Outlay'
WHERE tracking_number = 'PR-0007';
