-- Master Development Seed Runner
-- Target: Local Development Database ONLY
-- Executes all 10 modular seeds sequentially

\echo '========================================================'
\echo 'EXECUTING NIET DMS DEVELOPMENT SEED HARNESS (SEEDS 001-010)'
\echo '========================================================'

\i database/seeds/001_demo_departments.sql
\i database/seeds/002_demo_users.sql
\i database/seeds/003_demo_roles.sql
\i database/seeds/004_demo_academic_profiles.sql
\i database/seeds/005_demo_theses.sql
\i database/seeds/006_demo_assignments.sql
\i database/seeds/007_demo_dcec.sql
\i database/seeds/008_demo_panels.sql
\i database/seeds/009_demo_documents.sql
\i database/seeds/010_demo_audit.sql

\echo '========================================================'
\echo 'ALL 10 DEVELOPMENT SEEDS APPLIED SUCCESSFULLY.'
\echo '========================================================'
