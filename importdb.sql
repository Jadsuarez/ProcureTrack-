-- Procurement Monitoring System - Database
-- Import via phpMyAdmin or: mysql -u root < importdb.sql
--
-- Creates: offices (with fund_allocation), users, requests, status_logs, documents
-- Seeds:   33 system offices, 33 login accounts, sample tracking PR-0001–PR-0006, and six months of mock Lipa Campus requests

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
('requesting', 'Requesting Office', 1, 'system', 0.00),
('budget', 'Budget Office', 1, 'system', 250000.00),
('procurement', 'Procurement Office', 1, 'system', 0.00),
('accounting', 'Accounting Office', 1, 'system', 0.00),
('pso', 'Property and Supply Office', 1, 'system', 0.00),
('cashier', 'Cashier', 1, 'system', 0.00),
('vc_admin_finance', 'Office of the Vice Chancellor for Administration and Finance', 1, 'system', 0.00),
('chancellor', 'Office of the Chancellor, BatStateU Lipa', 1, 'system', 0.00),
('academic_affairs', 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa', 1, 'system', 0.00);

-- Requesting offices (Property and Supply and Academic Affairs use existing system offices)
INSERT IGNORE INTO offices (slug, label, is_system, created_by, fund_allocation) VALUES
('ovc_dev_external_affairs', 'OVC for Development and External Affairs', 1, 'system', 0.00),
('ict_services', 'ICT Services', 1, 'system', 0.00),
('resource_generation', 'Resource Generation', 1, 'system', 0.00),
('college_arts_sciences', 'College of Arts and Sciences', 1, 'system', 0.00),
('college_accountancy_biz_econ', 'College of Accountancy, Business and Economics', 1, 'system', 0.00),
('college_informatics_comp_sci', 'College of Informatics and Computing Sciences', 1, 'system', 0.00),
('college_engineering_technology', 'College of Engineering Technology', 1, 'system', 0.00),
('college_teacher_education', 'College of Teacher Education', 1, 'system', 0.00),
('culture_arts', 'Culture and Arts', 1, 'system', 0.00),
('medical_dental', 'Medical and Dental', 1, 'system', 0.00),
('laboratory', 'Laboratory', 1, 'system', 0.00),
('library_services', 'Library Services', 1, 'system', 0.00),
('registration_services', 'Registration Services', 1, 'system', 0.00),
('registration_services_grad', 'Registration Services (Graduation)', 1, 'system', 0.00),
('testing_admission_office', 'Testing and Admission Office', 1, 'system', 0.00),
('national_service_training', 'National Service Training Program', 1, 'system', 0.00),
('guidance_counseling', 'Office of the Guidance and Counseling', 1, 'system', 0.00),
('student_publication', 'Office of Student Publication', 1, 'system', 0.00),
('on_the_job_training', 'On-the-Job Training', 1, 'system', 0.00),
('sports_development', 'Sports and Development', 1, 'system', 0.00),
('sustainable_development_office', 'Sustainable Development Office', 1, 'system', 0.00),
('action_center', 'Action Center', 1, 'system', 0.00),
('extension_services_office', 'Extension Services Office', 1, 'system', 0.00),
('research_office', 'Research Office', 1, 'system', 0.00);

UPDATE offices SET fund_allocation = 0 WHERE slug <> 'budget';

-- User accounts (login credentials and office assignment)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  office VARCHAR(30) NOT NULL,
  display_name VARCHAR(100) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  preferences TEXT DEFAULT NULL,
  created_by VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default accounts (passwords shown in howtorun.txt)
INSERT INTO users (username, password_hash, office, created_by) VALUES
('requesting_user', '$2y$10$tIPD0DYkgn16OwJKa.Mt8.WgLLdFhfkzng9HoGuXiL7pvPK.nwc8G', 'requesting', 'system'),
('budget_user', '$2y$10$tVchF91xzKgzG1T/eM3OnetLESLwliFYycU3jqGlu5/tRDPaI0YLK', 'budget', 'system'),
('procurement_user', '$2y$10$JPNmPLbP329e6OFwbv0Qour18/TsEsclGH.zWa.kYe0Phv973Jtbi', 'procurement', 'system'),
('accounting_user', '$2y$10$6hM6pG4eabnbzg.Xmndf7OuhbY4EWaP2OcF4XWylm00Otp9UDT8z2', 'accounting', 'system'),
('cashier_user', '$2y$10$GbVe3da3AKH37vecHjx/D.iJquKVZDrbWMMQiJnBFtnE8.GXlmwMe', 'cashier', 'system'),
('vc_admin_finance_user', '$2y$10$sDFSq4d.H.1Rvh6NWFaYju/gWuqY1DGyygGoKnQk8RJcQFWHNMsE.', 'vc_admin_finance', 'system'),
('chancellor_user', '$2y$10$iBRKXmuuuhoV60EX7vssleWFVltRzRQtyB/GX94zDP7wlfIfaGcVO', 'chancellor', 'system'),
('academic_affairs_user', '$2y$10$IRoEwwoXNAPWT0wnv7UUXOP8K3VWgLBO2o2JAMW7opTAfU74OYEVi', 'academic_affairs', 'system');

-- Requesting-office accounts use office-specific initial passwords listed in howtorun.txt.
INSERT INTO users (username, password_hash, office, created_by) VALUES
('property_supply_user', '$2y$10$LcxGKDcaUuP4UD276skASenYdKz/8Kkq1W5anb1ViC5p.XEmCHfxa', 'pso', 'system'),
('ovc_dev_external_affairs_user', '$2y$10$VDwiKNN4GfEqagCeQGt.1eHUpv4rxxP58FAF6sqD/4/p6jPpbZptS', 'ovc_dev_external_affairs', 'system'),
('ict_services_user', '$2y$10$.G2MlfesnqqAdi637kfzbulbWZTKzavYHBesOfYB2v1zjw5RRRYqK', 'ict_services', 'system'),
('resource_generation_user', '$2y$10$.BUHLOYv6YyYJI0NwN8e2u73Lh4m8KfH6BwKICektcjgwbUGzzPAO', 'resource_generation', 'system'),
('college_arts_sciences_user', '$2y$10$6sMhm.JD1UGJqx4y91TeOOMvRZ43Ay8YH3x1RhOGqz1BryI6opuGi', 'college_arts_sciences', 'system'),
('college_accountancy_biz_econ_user', '$2y$10$BBg8Rs76E4FC0JXLCzw5Auwb2RS8cHVrrhvg.RGHGUMIMB/5RG9u2', 'college_accountancy_biz_econ', 'system'),
('college_informatics_comp_sci_user', '$2y$10$gjK0eLvV37GCLMwwIGEDpO0xcVhU/K2nuZB72dl8gS0iwfJKzlCyO', 'college_informatics_comp_sci', 'system'),
('college_engineering_technology_user', '$2y$10$PMjKSqiPQO.K7ITSIT4ceuNsdBgrRJX0xQc2vf7uZsG8HxhcAapTW', 'college_engineering_technology', 'system'),
('college_teacher_education_user', '$2y$10$G5s4Scx03qufDJ8HG5ulsOI5IjcCkJvUnsBpm7yuYRmn2fc8gywvm', 'college_teacher_education', 'system'),
('culture_arts_user', '$2y$10$KjjBpE4d2r8Hnt1YZb1fpuCsIYLuhjYBlZKd4xqC39cD3K5J9/WxS', 'culture_arts', 'system'),
('medical_dental_user', '$2y$10$iiI.ucqAolWuZDNLvOVza.UpoZ8cTCllzsdIC2LAujmrf9Vp8BjBm', 'medical_dental', 'system'),
('laboratory_user', '$2y$10$BFZyuv.HNnZGIyhYrAj2nuHBua1wqnm1ripHM9m7f7bsPpaHbOEry', 'laboratory', 'system'),
('library_services_user', '$2y$10$asXox0JYAqh8VV1BF5b1SOPe8ZBVjRy2JU4rgJhOjCTQpBP7GkI/6', 'library_services', 'system'),
('registration_services_user', '$2y$10$7MRzwLq5MfnGqD7z9PBVjuMBFFhIVXxRVi391MSUjmZ3N0Hl3Vt5u', 'registration_services', 'system'),
('registration_services_grad_user', '$2y$10$2nV4pVuSR4Z.Z0dp8H12D.kfb1CrfHdklzFtDd1TvM8C7kt5kav7e', 'registration_services_grad', 'system'),
('testing_admission_office_user', '$2y$10$t/utNc6DoACuxaD.XdLDY.pAmd2KrZB0GZRsveZ.oHGA42kmIcmmO', 'testing_admission_office', 'system'),
('national_service_training_user', '$2y$10$aT9MgTI4/UbU9QsYBlmCYuuv2NTB.J0haW4k72OaevfF07VErpIg.', 'national_service_training', 'system'),
('guidance_counseling_user', '$2y$10$4D6byDD7T.IYHPmaje7ABOGj4gKyY1pm2JdOupiqEm4QocYoPOMwm', 'guidance_counseling', 'system'),
('student_publication_user', '$2y$10$hz2Y0YPQrJF0W4ZB8k9gQOFXKTlrsmuMbPU2AWZjDlYbBPDf3nt6G', 'student_publication', 'system'),
('on_the_job_training_user', '$2y$10$NueJ0Wi8cd3ynq0R99NB/OVEjhKWk3kRZokAoFOcnL94rHfomOIKS', 'on_the_job_training', 'system'),
('sports_development_user', '$2y$10$x1A9pP5Y203qwSYM5CpY0uDxRwh3IUXXleVciw616TQgjQBZ3b1gi', 'sports_development', 'system'),
('sustainable_development_office_user', '$2y$10$2obvsPdLyM/MwBaiEK2zkuG4oX6VMSod4RCekcPuwt3CmXiju9jtK', 'sustainable_development_office', 'system'),
('action_center_user', '$2y$10$24ykYi304./y3zjEjUgPye8kHZbJfNWfZGW2WLp3p4rE3f8jDxeSq', 'action_center', 'system'),
('extension_services_office_user', '$2y$10$OpD7FzXWT/GmcuOyy.ZqbuIYl1zKZ.S7nCZXtvsL2zl5xQCtBnOuq', 'extension_services_office', 'system'),
('research_office_user', '$2y$10$4z4gWQ0aH6OTIANjiBTulezXe3C9qBXl.M0gDtsRZ8s19V6zVhBlm', 'research_office', 'system')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

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
  template_key VARCHAR(50) DEFAULT NULL,
  signatory_name VARCHAR(150) NOT NULL,
  designation VARCHAR(150) DEFAULT NULL,
  department VARCHAR(150) DEFAULT NULL,
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

-- Fixed signatory offices; names are editable from Requesting Office Settings.
CREATE TABLE IF NOT EXISTS signatory_templates (
  template_key VARCHAR(50) PRIMARY KEY,
  signatory_name VARCHAR(150) NOT NULL,
  designation VARCHAR(150) NOT NULL,
  department VARCHAR(150) NOT NULL,
  approval_order INT NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

INSERT IGNORE INTO signatory_templates
  (template_key, signatory_name, designation, department, approval_order, is_required)
VALUES
  ('head_accounting', 'Maria Elena Santos', 'Head, Accounting, BatstateU Lipa', 'Accounting Office, BatstateU Lipa', 1, 1),
  ('vice_chancellor_admin_finance', 'Jose Miguel Reyes', 'Vice Chancellor for Administration and Finance', 'Office of the Vice Chancellor for Administration and Finance, BatStateU Lipa', 2, 1),
  ('chancellor', 'Alberto Cruz', 'Chancellor, BatStateU Lipa', 'Office of the Chancellor, BatStateU Lipa', 3, 1),
  ('vice_chancellor_academic_affairs', 'Patricia Anne Mendoza', 'Vice Chancellor for Academic Affairs, BatStateU Lipa', 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa', 4, 1),
  ('vice_chancellor_academic_affairs_2', 'Ramon Luis Bautista', 'Vice Chancellor for Academic Affairs, BatStateU Lipa', 'Office of the Vice Chancellor for Academic Affairs, BatStateU Lipa', 5, 0);

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
('PR-0006', 'Laboratory Supplies', 'Reagents and consumables for science lab', 'Canvass', 'Procurement Office');

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
(5, 'Review', 'Accounting Office', 'Accounting review in process'),
(5, 'Paid', 'Cashier', 'Marked as paid (monitoring)'),
(5, 'Completed', 'Cashier', 'Transaction finished'),
(6, 'Registered', 'system', NULL),
(6, 'Under Budget Review', 'Budget Office', NULL),
(6, 'Reviewed', 'Budget Office', NULL),
(6, 'Canvass', 'Procurement Office', NULL),
(6, 'PO', 'Procurement Office', 'Purchase order issued'),
(6, 'Review', 'Accounting Office', NULL),
(6, 'Canvass', 'Procurement Office', 'Awaiting procurement canvass');

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
('PR-M2603', 'BS Mechanical Engineering Machine Shop Tools', 'Machine shop tools, measuring instruments, and safety equipment for mechanical engineering instruction.', 524300.00, 'requesting', 'BUR-2026-051', 'ORS-2026-121', 'Capital Outlay', 'Review', 'Mock accounting review monitoring.', 'Accounting Office', '2026-05-06 09:30:00', '2026-06-04 10:00:00'),
('PR-M2604', 'BS Accountancy Instructional Materials', 'Accounting textbooks, practice sets, and instructional materials for accountancy courses.', 96500.00, 'requesting', 'BUR-2026-052', 'ORS-2026-122', 'MOOE', 'Reviewed', 'Mock budget-reviewed transaction.', 'Budget Office', '2026-05-19 11:00:00', '2026-05-25 09:15:00'),
('PR-J2601', 'BS Business Administration Entrepreneurship Supplies', 'Training materials and workshop supplies for business administration entrepreneurship activities.', 142800.00, 'requesting', 'BUR-2026-061', 'ORS-2026-131', 'MOOE', 'PO', 'Mock purchase order monitoring.', 'Procurement Office', '2026-06-03 08:30:00', '2026-06-18 14:45:00'),
('PR-J2602', 'BS Information Technology Server Room Cooling', 'Dedicated cooling equipment and monitoring devices for the information technology server room.', 198400.00, 'requesting', 'BUR-2026-062', 'ORS-2026-132', 'Capital Outlay', 'Paid', 'Mock paid transaction awaiting final completion marking.', 'Cashier', '2026-06-24 10:40:00', '2026-07-31 13:00:00'),
('PR-J2603', 'BS Civil Engineering Materials Testing Supplies', 'Concrete, aggregate, and materials testing consumables for civil engineering laboratory exercises.', 176250.00, 'requesting', NULL, NULL, NULL, 'Under Budget Review', 'Mock request under budget review.', 'Budget Office', '2026-07-08 09:05:00', '2026-07-10 10:30:00'),
('PR-J2604', 'BS Electrical Engineering Renewable Energy Trainer', 'Renewable energy training equipment and laboratory accessories for electrical engineering activities.', 486900.00, 'requesting', 'BUR-2026-072', 'ORS-2026-142', 'Capital Outlay', 'Accepted', 'Mock transaction accepted by PSO.', 'PSO', '2026-07-22 14:20:00', '2026-08-20 15:10:00'),
('PR-A2603', 'BS Mechanical Engineering Computer-Aided Design Licenses', 'Temporary software licenses and training resources for mechanical engineering design activities.', 219600.00, 'requesting', 'BUR-2026-081', 'ORS-2026-151', 'MOOE', 'Canvass', 'Mock canvassing transaction.', 'Procurement Office', '2026-08-05 08:50:00', '2026-08-13 11:00:00'),
('PR-A2604', 'BS Computer Science Student Project Equipment', 'Microcontroller kits, sensors, and project components for computer science student development activities.', 118750.00, 'requesting', NULL, NULL, NULL, 'Registered', 'Mock newly registered request.', 'Requesting Office', '2026-08-26 10:25:00', '2026-08-26 10:25:00');

-- Snapshot the fixed signatories for demo requests; active Registered requests still need signatures.
INSERT INTO request_signatories
  (request_id, template_key, signatory_name, designation, department, assigned_office, approval_order, status, signed_at, updated_by)
SELECT
  r.id,
  t.template_key,
  t.signatory_name,
  t.designation,
  t.department,
  CASE t.template_key
    WHEN 'head_accounting' THEN 'accounting'
    WHEN 'vice_chancellor_admin_finance' THEN 'vc_admin_finance'
    WHEN 'chancellor' THEN 'chancellor'
    WHEN 'vice_chancellor_academic_affairs' THEN 'academic_affairs'
  END,
  t.approval_order,
  CASE WHEN r.status = 'Registered' THEN 'Pending Signature' ELSE 'Signed' END,
  CASE WHEN r.status = 'Registered' THEN NULL ELSE r.updated_at END,
  CASE WHEN r.status = 'Registered' THEN 'system' ELSE r.updated_by END
FROM requests r
CROSS JOIN signatory_templates t
WHERE t.is_required = 1;

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
SELECT id, 'Review', 'Accounting Office', 'Mock accounting review in process.', '2026-04-03 11:00:00' FROM requests WHERE tracking_number = 'PR-M2601';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
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
SELECT id, 'Review', 'Accounting Office', 'Mock accounting review in process.', '2026-05-20 11:00:00' FROM requests WHERE tracking_number = 'PR-A2602';
INSERT INTO status_logs (request_id, status, updated_by, notes, created_at)
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
SELECT id, 'Review', 'Accounting Office', 'Mock accounting review in process.', '2026-06-04 10:00:00' FROM requests WHERE tracking_number = 'PR-M2603';

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
