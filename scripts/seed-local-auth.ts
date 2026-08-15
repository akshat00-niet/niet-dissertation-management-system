import { Client } from 'pg';

/**
 * Local Development Supabase Auth Persona Provisioning Script
 *
 * IMPORTANT:
 * - This script is for LOCAL DEVELOPMENT ONLY.
 * - Enforces the invariant: auth.users.id === public.users.id.
 * - Idempotently provisions auth.users and auth.identities for the 15 synthetic development personas.
 * - Passwords are read from DEV_AUTH_PASSWORD environment variable (fallback to secure local default).
 * - Never prints or leaks passwords.
 */

export interface DevelopmentPersona {
  key: string;
  id: string;
  email: string;
  fullName: string;
  primaryRole: string;
  departmentCode: string;
}

export const DEVELOPMENT_PERSONAS: DevelopmentPersona[] = [
  {
    key: 'STUDENT_CSE',
    id: '11111111-1111-1111-1111-111111111111',
    email: 'demo.student.cse@dev.local',
    fullName: 'Aarav Sharma (Demo Student CSE)',
    primaryRole: 'STUDENT',
    departmentCode: 'CSE',
  },
  {
    key: 'STUDENT_ECE',
    id: '22222222-2222-2222-2222-222222222222',
    email: 'demo.student.ece@dev.local',
    fullName: 'Isha Verma (Demo Student ECE)',
    primaryRole: 'STUDENT',
    departmentCode: 'ECE',
  },
  {
    key: 'GUIDE_A',
    id: '33333333-3333-3333-3333-333333333333',
    email: 'demo.guide.a@dev.local',
    fullName: 'Dr. Rajesh Kumar (Demo Guide A)',
    primaryRole: 'GUIDE',
    departmentCode: 'CSE',
  },
  {
    key: 'GUIDE_B',
    id: '44444444-4444-4444-4444-444444444444',
    email: 'demo.guide.b@dev.local',
    fullName: 'Dr. Priya Singh (Demo Guide B)',
    primaryRole: 'GUIDE',
    departmentCode: 'ECE',
  },
  {
    key: 'COGUIDE_A',
    id: '55555555-5555-5555-5555-555555555555',
    email: 'demo.coguide.a@dev.local',
    fullName: 'Dr. Amit Patel (Demo Co-Guide A)',
    primaryRole: 'CO_GUIDE',
    departmentCode: 'CSE',
  },
  {
    key: 'DC_CSE',
    id: '66666666-6666-6666-6666-666666666666',
    email: 'demo.dc.cse@dev.local',
    fullName: 'Dr. Sunita Rao (Demo DC CSE)',
    primaryRole: 'DC',
    departmentCode: 'CSE',
  },
  {
    key: 'DC_ECE',
    id: '66666666-eeee-6666-eeee-666666666666',
    email: 'demo.dc.ece@dev.local',
    fullName: 'Dr. Alok Mishra (Demo DC ECE)',
    primaryRole: 'DC',
    departmentCode: 'ECE',
  },
  {
    key: 'DHOD_CSE',
    id: '77777777-7777-7777-7777-777777777777',
    email: 'demo.dhod.cse@dev.local',
    fullName: 'Dr. Vikram Malhotra (Demo DHOD CSE)',
    primaryRole: 'DHOD',
    departmentCode: 'CSE',
  },
  {
    key: 'HOD_CSE',
    id: '88888888-8888-8888-8888-888888888888',
    email: 'demo.hod.cse@dev.local',
    fullName: 'Prof. Dr. Ananya Sen (Demo HOD CSE)',
    primaryRole: 'HOD',
    departmentCode: 'CSE',
  },
  {
    key: 'HOD_ECE',
    id: '88888888-eeee-8888-eeee-888888888888',
    email: 'demo.hod.ece@dev.local',
    fullName: 'Prof. Dr. Sandeep Reddy (Demo HOD ECE)',
    primaryRole: 'HOD',
    departmentCode: 'ECE',
  },
  {
    key: 'PANEL_A',
    id: '99999999-9999-9999-9999-999999999999',
    email: 'demo.panel.a@dev.local',
    fullName: 'Dr. Manish Gupta (Demo Panel Member A)',
    primaryRole: 'PANEL_MEMBER',
    departmentCode: 'CSE',
  },
  {
    key: 'PANEL_B',
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'demo.panel.b@dev.local',
    fullName: 'Dr. Sneha Joshi (Demo Panel Member B)',
    primaryRole: 'PANEL_MEMBER',
    departmentCode: 'CSE',
  },
  {
    key: 'DCEC_MEMBER',
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'demo.dcec.member@dev.local',
    fullName: 'Dr. Kavin Mehta (Demo DCEC Member)',
    primaryRole: 'DCEC_MEMBER',
    departmentCode: 'CSE',
  },
  {
    key: 'BASE_FACULTY',
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'demo.faculty.unassigned@dev.local',
    fullName: 'Dr. Neha Tiwari (Demo Base Faculty)',
    primaryRole: 'FACULTY',
    departmentCode: 'CSE',
  },
  {
    key: 'ADMIN_USR',
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'demo.admin@dev.local',
    fullName: 'System Administrator (Demo Admin)',
    primaryRole: 'ADMIN',
    departmentCode: 'GLOBAL',
  },
];

export async function provisionLocalAuthUsers(): Promise<void> {
  const dbUrl = process.env.LOCAL_SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  const devPassword = process.env.DEV_AUTH_PASSWORD;

  if (!devPassword || devPassword.trim() === '') {
    throw new Error(
      'Missing required environment variable: DEV_AUTH_PASSWORD.\n' +
      'Please provide DEV_AUTH_PASSWORD (e.g. $env:DEV_AUTH_PASSWORD="<local-password>" npm run seed:local-auth) to provision local development personas.'
    );
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Connected to Local Supabase PostgreSQL on 127.0.0.1:54322.');

    // Ensure pgcrypto extension is active in extensions or public schema
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;`);

    await client.query('BEGIN;');

    for (const persona of DEVELOPMENT_PERSONAS) {
      // 1. Conflict Check: Verify if email exists with a DIFFERENT UUID
      const existingEmailRes = await client.query(
        `SELECT id, email FROM auth.users WHERE lower(email) = lower($1);`,
        [persona.email]
      );

      if (existingEmailRes.rows.length > 0 && existingEmailRes.rows[0].id !== persona.id) {
        throw new Error(
          `Conflict detected! Email "${persona.email}" is already registered under a different UUID: "${existingEmailRes.rows[0].id}". Expected deterministic UUID: "${persona.id}".`
        );
      }

      // 2. Upsert auth.users record
      await client.query(
        `
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          confirmation_token,
          recovery_token,
          email_change_token_new,
          email_change,
          phone_change,
          phone_change_token,
          email_change_token_current,
          reauthentication_token,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          is_sso_user,
          is_anonymous
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          $1::uuid,
          'authenticated',
          'authenticated',
          $2::text,
          extensions.crypt($3::text, extensions.gen_salt('bf')),
          clock_timestamp(),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '{"provider": "email", "providers": ["email"]}'::jsonb,
          jsonb_build_object('full_name', $4::text, 'persona_key', $5::text),
          clock_timestamp(),
          clock_timestamp(),
          false,
          false
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          encrypted_password = EXCLUDED.encrypted_password,
          email_confirmed_at = EXCLUDED.email_confirmed_at,
          confirmation_token = EXCLUDED.confirmation_token,
          recovery_token = EXCLUDED.recovery_token,
          email_change_token_new = EXCLUDED.email_change_token_new,
          email_change = EXCLUDED.email_change,
          phone_change = EXCLUDED.phone_change,
          phone_change_token = EXCLUDED.phone_change_token,
          email_change_token_current = EXCLUDED.email_change_token_current,
          reauthentication_token = EXCLUDED.reauthentication_token,
          raw_app_meta_data = EXCLUDED.raw_app_meta_data,
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          updated_at = clock_timestamp();
        `,
        [persona.id, persona.email, devPassword, persona.fullName, persona.key]
      );

      // 3. Upsert auth.identities record
      await client.query(
        `
        INSERT INTO auth.identities (
          provider_id,
          user_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          $1::text,
          $2::uuid,
          jsonb_build_object('sub', $2::text, 'email', $3::text, 'email_verified', true),
          'email',
          clock_timestamp(),
          clock_timestamp(),
          clock_timestamp()
        )
        ON CONFLICT (provider_id, provider) DO UPDATE SET
          identity_data = EXCLUDED.identity_data,
          updated_at = clock_timestamp();
        `,
        [persona.id, persona.id, persona.email]
      );
    }

    // 4. Ensure PostgREST roles have appropriate permissions on public tables
    // RLS policies enforce all row-level authorization; table-level grants allow PostgREST to reach RLS evaluation.
    await client.query(`
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
      GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO authenticated, service_role;
    `);

    await client.query('COMMIT;');
    console.log(`Successfully provisioned/verified all ${DEVELOPMENT_PERSONAS.length} development auth personas in local Supabase.`);

    // 4. Verification & Reconciliation Queries
    const reconciliationRes = await client.query(`
      SELECT
        u.id AS public_id,
        au.id AS auth_id,
        u.institutional_email,
        u.full_name,
        u.is_active,
        COALESCE(string_agg(ura.role_id, ', ' ORDER BY ura.role_id), 'NO_ROLE') AS assigned_roles,
        d.code AS department_code
      FROM public.users u
      JOIN auth.users au ON au.id = u.id
      LEFT JOIN public.user_role_assignments ura ON ura.user_id = u.id AND ura.is_active = TRUE
      LEFT JOIN public.departments d ON d.id = ura.department_id
      GROUP BY u.id, au.id, u.institutional_email, u.full_name, u.is_active, d.code
      ORDER BY u.id;
    `);

    console.log('\n================ RECONCILED PERSONA INVENTORY ================');
    console.table(
      reconciliationRes.rows.map((row) => ({
        UUID: row.auth_id,
        Email: row.institutional_email,
        Name: row.full_name,
        Active: row.is_active,
        Roles: row.assigned_roles,
        Dept: row.department_code || 'GLOBAL',
        'UUID Match': row.public_id === row.auth_id,
      }))
    );
    console.log('==============================================================\n');
  } catch (error) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('Failed to provision local auth personas:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Execute if run directly
if (require.main === module) {
  provisionLocalAuthUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
