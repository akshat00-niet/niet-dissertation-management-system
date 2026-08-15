-- Seed 002: Demo Base Users
-- Target: Local Development Database ONLY
-- Synthetic Identities (dev.local)

BEGIN;

INSERT INTO users (id, institutional_email, full_name, phone_number, is_active) VALUES
-- Students
('11111111-1111-1111-1111-111111111111', 'demo.student.cse@dev.local', 'Aarav Sharma (Demo Student CSE)', '+919876543210', TRUE),
('22222222-2222-2222-2222-222222222222', 'demo.student.ece@dev.local', 'Isha Verma (Demo Student ECE)', '+919876543211', TRUE),

-- Faculty: Guides & Co-Guides
('33333333-3333-3333-3333-333333333333', 'demo.guide.a@dev.local', 'Dr. Rajesh Kumar (Demo Guide A)', '+919876543212', TRUE),
('44444444-4444-4444-4444-444444444444', 'demo.guide.b@dev.local', 'Dr. Priya Singh (Demo Guide B)', '+919876543213', TRUE),
('55555555-5555-5555-5555-555555555555', 'demo.coguide.a@dev.local', 'Dr. Amit Patel (Demo Co-Guide A)', '+919876543214', TRUE),

-- Department Academic Authorities
('66666666-6666-6666-6666-666666666666', 'demo.dc.cse@dev.local', 'Dr. Sunita Rao (Demo DC CSE)', '+919876543215', TRUE),
('66666666-eeee-6666-eeee-666666666666', 'demo.dc.ece@dev.local', 'Dr. Alok Mishra (Demo DC ECE)', '+919876543216', TRUE),
('77777777-7777-7777-7777-777777777777', 'demo.dhod.cse@dev.local', 'Dr. Vikram Malhotra (Demo DHOD CSE)', '+919876543217', TRUE),
('88888888-8888-8888-8888-888888888888', 'demo.hod.cse@dev.local', 'Prof. Dr. Ananya Sen (Demo HOD CSE)', '+919876543218', TRUE),
('88888888-eeee-8888-eeee-888888888888', 'demo.hod.ece@dev.local', 'Prof. Dr. Sandeep Reddy (Demo HOD ECE)', '+919876543219', TRUE),

-- Oral Defense Panel Examiners
('99999999-9999-9999-9999-999999999999', 'demo.panel.a@dev.local', 'Dr. Manish Gupta (Demo Panel Member A)', '+919876543220', TRUE),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'demo.panel.b@dev.local', 'Dr. Sneha Joshi (Demo Panel Member B)', '+919876543221', TRUE),

-- DCEC Committee Member & General Faculty
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'demo.dcec.member@dev.local', 'Dr. Kavin Mehta (Demo DCEC Member)', '+919876543222', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'demo.faculty.unassigned@dev.local', 'Dr. Neha Tiwari (Demo Base Faculty)', '+919876543223', TRUE),

-- Technical Administrator
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'demo.admin@dev.local', 'System Administrator (Demo Admin)', '+919876543224', TRUE)
ON CONFLICT (id) DO UPDATE SET institutional_email = EXCLUDED.institutional_email, full_name = EXCLUDED.full_name, is_active = EXCLUDED.is_active;

COMMIT;
