-- Migration: 004_identity_and_rbac.sql
-- Description: Create identity and RBAC tables (users, roles, permissions, role_permissions, user_role_assignments).
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 004 of 018

-- Table 6: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institutional_email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_users_email UNIQUE (institutional_email)
);

-- Table 7: roles (Static Reference Catalog)
CREATE TABLE roles (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    is_academic BOOLEAN NOT NULL DEFAULT TRUE
);

-- Insert Canonical Base Roles
INSERT INTO roles (id, title, description, is_academic) VALUES
('STUDENT', 'Student Candidate', 'Enrolled dissertation candidate', TRUE),
('FACULTY', 'Base Faculty Member', 'Academic teaching and research staff', TRUE),
('GUIDE', 'Primary Guide', 'Primary supervisor of record for a thesis', TRUE),
('CO_GUIDE', 'Co-Guide', 'Secondary collaborating supervisor of record', TRUE),
('DC', 'Department Coordinator', 'Maker / Secretary for DCEC screening workflows', TRUE),
('DHOD', 'Deputy Head of Department', 'Supervisor allocation authority and potential delegate', TRUE),
('HOD', 'Head of Department', 'Academic head and default DCEC Chair Checker', TRUE),
('DCEC_MEMBER', 'DCEC Member', 'Departmental evaluation committee member', TRUE),
('DCEC_CHAIR', 'DCEC Chair Authority', 'Formal approval authority for dockets and titles', TRUE),
('PANEL_MEMBER', 'Expert Panel Member', 'Oral defense examiner on appointed 2-member panel', TRUE),
('ADMIN', 'System Administrator', 'Purely technical system and user management', FALSE);

-- Table 8: permissions (Static Reference Catalog)
CREATE TABLE permissions (
    id VARCHAR(64) PRIMARY KEY,
    module VARCHAR(32) NOT NULL,
    description TEXT NOT NULL
);

-- Table 9: role_permissions
CREATE TABLE role_permissions (
    role_id VARCHAR(32) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    permission_id VARCHAR(64) NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (role_id, permission_id)
);

-- Table 10: user_role_assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(32) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department_id UUID DEFAULT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    session_id UUID DEFAULT NULL REFERENCES academic_sessions(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_user_role_scope UNIQUE (user_id, role_id, department_id, session_id)
);

CREATE INDEX idx_user_role_assignments_user_active ON user_role_assignments(user_id, is_active);
CREATE INDEX idx_user_role_assignments_dept ON user_role_assignments(department_id) WHERE is_active = TRUE;
