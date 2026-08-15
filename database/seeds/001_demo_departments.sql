-- Seed 001: Demo Departments, Sessions, Programs, Batches, and Sections
-- Target: Local Development Database ONLY

BEGIN;

-- 1. Departments
INSERT INTO departments (id, code, name, school_name, is_active) VALUES
('10000000-0000-0000-0000-000000000001', 'CSE', 'Department of Computer Science and Engineering', 'School of Engineering and Technology', TRUE),
('10000000-0000-0000-0000-000000000002', 'ECE', 'Department of Electronics and Communication Engineering', 'School of Engineering and Technology', TRUE)
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, school_name = EXCLUDED.school_name, is_active = EXCLUDED.is_active;

-- 2. Academic Sessions
INSERT INTO academic_sessions (id, session_name, start_date, end_date, is_current) VALUES
('20000000-0000-0000-0000-000000000001', '2025-2027 M.Tech Cycle', '2025-08-01', '2027-06-30', TRUE)
ON CONFLICT (id) DO UPDATE SET session_name = EXCLUDED.session_name, is_current = EXCLUDED.is_current;

-- 3. Programs
INSERT INTO programs (id, department_id, code, name, duration_semesters) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'MTECH-CSE', 'Master of Technology in Computer Science', 4),
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'MTECH-ECE', 'Master of Technology in VLSI & Embedded Systems', 4)
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, duration_semesters = EXCLUDED.duration_semesters;

-- 4. Batches
INSERT INTO batches (id, program_id, session_id, name, is_active) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'M.Tech CSE Batch 2025-27', TRUE),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'M.Tech ECE Batch 2025-27', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- 5. Sections
INSERT INTO sections (id, batch_id, name) VALUES
('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Section A'),
('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Section A')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

COMMIT;
