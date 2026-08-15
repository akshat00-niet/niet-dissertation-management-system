-- Seed 011: Local Supabase Auth Users
-- Target: Local Supabase Auth (auth.users & auth.identities) ONLY
-- NEVER RUN ON PRODUCTION SUPABASE PROJECT
-- Enforces: auth.users.id === public.users.id for all 15 synthetic personas

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Require app.dev_auth_password session variable to be set before execution
DO $$
BEGIN
    IF current_setting('app.dev_auth_password', true) IS NULL OR current_setting('app.dev_auth_password', true) = '' THEN
        RAISE EXCEPTION 'Missing required session setting app.dev_auth_password. Please set it before running this script: SET app.dev_auth_password = ''your_password'';';
    END IF;
END $$;

-- 1. STUDENT_CSE
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'demo.student.cse@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Aarav Sharma (Demo Student CSE)", "persona_key": "STUDENT_CSE"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "demo.student.cse@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 2. STUDENT_ECE
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'demo.student.ece@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Isha Verma (Demo Student ECE)", "persona_key": "STUDENT_ECE"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "demo.student.ece@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 3. GUIDE_A
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'demo.guide.a@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Rajesh Kumar (Demo Guide A)", "persona_key": "GUIDE_A"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub": "33333333-3333-3333-3333-333333333333", "email": "demo.guide.a@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 4. GUIDE_B
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'demo.guide.b@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Priya Singh (Demo Guide B)", "persona_key": "GUIDE_B"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub": "44444444-4444-4444-4444-444444444444", "email": "demo.guide.b@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 5. COGUIDE_A
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'demo.coguide.a@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Amit Patel (Demo Co-Guide A)", "persona_key": "COGUIDE_A"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', '{"sub": "55555555-5555-5555-5555-555555555555", "email": "demo.coguide.a@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 6. DC_CSE
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'demo.dc.cse@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Sunita Rao (Demo DC CSE)", "persona_key": "DC_CSE"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '{"sub": "66666666-6666-6666-6666-666666666666", "email": "demo.dc.cse@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 7. DC_ECE
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '66666666-eeee-6666-eeee-666666666666', 'authenticated', 'authenticated', 'demo.dc.ece@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Alok Mishra (Demo DC ECE)", "persona_key": "DC_ECE"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('66666666-eeee-6666-eeee-666666666666', '66666666-eeee-6666-eeee-666666666666', '{"sub": "66666666-eeee-6666-eeee-666666666666", "email": "demo.dc.ece@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 8. DHOD_CSE
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated', 'demo.dhod.cse@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Vikram Malhotra (Demo DHOD CSE)", "persona_key": "DHOD_CSE"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', '{"sub": "77777777-7777-7777-7777-777777777777", "email": "demo.dhod.cse@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 9. HOD_CSE
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '88888888-8888-8888-8888-888888888888', 'authenticated', 'authenticated', 'demo.hod.cse@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Prof. Dr. Ananya Sen (Demo HOD CSE)", "persona_key": "HOD_CSE"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', '{"sub": "88888888-8888-8888-8888-888888888888", "email": "demo.hod.cse@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 10. HOD_ECE
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '88888888-eeee-8888-eeee-888888888888', 'authenticated', 'authenticated', 'demo.hod.ece@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Prof. Dr. Sandeep Reddy (Demo HOD ECE)", "persona_key": "HOD_ECE"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('88888888-eeee-8888-eeee-888888888888', '88888888-eeee-8888-eeee-888888888888', '{"sub": "88888888-eeee-8888-eeee-888888888888", "email": "demo.hod.ece@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 11. PANEL_A
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated', 'demo.panel.a@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Manish Gupta (Demo Panel Member A)", "persona_key": "PANEL_A"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('99999999-9999-9999-9999-999999999999', '99999999-9999-9999-9999-999999999999', '{"sub": "99999999-9999-9999-9999-999999999999", "email": "demo.panel.a@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 12. PANEL_B
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'demo.panel.b@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Sneha Joshi (Demo Panel Member B)", "persona_key": "PANEL_B"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "email": "demo.panel.b@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 13. DCEC_MEMBER
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'demo.dcec.member@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Kavin Mehta (Demo DCEC Member)", "persona_key": "DCEC_MEMBER"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "email": "demo.dcec.member@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 14. BASE_FACULTY
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'demo.faculty.unassigned@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "Dr. Neha Tiwari (Demo Base Faculty)", "persona_key": "BASE_FACULTY"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "email": "demo.faculty.unassigned@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

-- 15. ADMIN_USR
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'demo.admin@dev.local', extensions.crypt(current_setting('app.dev_auth_password', true), extensions.gen_salt('bf')), clock_timestamp(), '', '', '', '', '', '', '', '', '{"provider": "email", "providers": ["email"]}'::jsonb, '{"full_name": "System Administrator (Demo Admin)", "persona_key": "ADMIN_USR"}'::jsonb, clock_timestamp(), clock_timestamp(), false, false)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password, email_confirmed_at = EXCLUDED.email_confirmed_at, raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data, updated_at = clock_timestamp();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "email": "demo.admin@dev.local", "email_verified": true}'::jsonb, 'email', clock_timestamp(), clock_timestamp(), clock_timestamp())
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = clock_timestamp();

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO authenticated, service_role;

COMMIT;
