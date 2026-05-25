-- Procurement Monitoring System - Database
-- Import via phpMyAdmin or: mysql -u root procurement_monitoring < importdb.sql

CREATE DATABASE IF NOT EXISTS procurement_monitoring
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE procurement_monitoring;

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
