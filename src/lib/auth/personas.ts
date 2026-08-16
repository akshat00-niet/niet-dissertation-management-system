import type { RoleType } from '@/types/database.types';

export type PersonaGroup =
  | 'Students'
  | 'Faculty / Supervisors'
  | 'Department Authorities'
  | 'Defense / Evaluation'
  | 'Administration';

export interface DevelopmentPersona {
  key: string;
  id: string;
  email: string;
  fullName: string;
  primaryRole: RoleType;
  departmentCode: string;
  group: PersonaGroup;
  description: string;
}

export interface SafePersonaDisplay {
  key: string;
  fullName: string;
  primaryRole: RoleType;
  departmentCode: string;
  group: PersonaGroup;
  description: string;
}

export const DEVELOPMENT_PERSONAS: readonly DevelopmentPersona[] = [
  {
    key: 'STUDENT_CSE',
    id: '11111111-1111-1111-1111-111111111111',
    email: 'demo.student.cse@dev.local',
    fullName: 'Aarav Sharma',
    primaryRole: 'STUDENT',
    departmentCode: 'CSE',
    group: 'Students',
    description: 'M.Tech CSE Candidate (Semester 3, Eligible)',
  },
  {
    key: 'STUDENT_ECE',
    id: '22222222-2222-2222-2222-222222222222',
    email: 'demo.student.ece@dev.local',
    fullName: 'Isha Verma',
    primaryRole: 'STUDENT',
    departmentCode: 'ECE',
    group: 'Students',
    description: 'M.Tech ECE Candidate (Semester 3, Eligible)',
  },
  {
    key: 'GUIDE_A',
    id: '33333333-3333-3333-3333-333333333333',
    email: 'demo.guide.a@dev.local',
    fullName: 'Dr. Rajesh Kumar',
    primaryRole: 'GUIDE',
    departmentCode: 'CSE',
    group: 'Faculty / Supervisors',
    description: 'Associate Professor & Primary Supervisor (CSE)',
  },
  {
    key: 'GUIDE_B',
    id: '44444444-4444-4444-4444-444444444444',
    email: 'demo.guide.b@dev.local',
    fullName: 'Dr. Priya Singh',
    primaryRole: 'GUIDE',
    departmentCode: 'ECE',
    group: 'Faculty / Supervisors',
    description: 'Professor & Primary Supervisor (ECE)',
  },
  {
    key: 'COGUIDE_A',
    id: '55555555-5555-5555-5555-555555555555',
    email: 'demo.coguide.a@dev.local',
    fullName: 'Dr. Amit Patel',
    primaryRole: 'CO_GUIDE',
    departmentCode: 'CSE',
    group: 'Faculty / Supervisors',
    description: 'Assistant Professor & Co-Supervisor (CSE)',
  },
  {
    key: 'BASE_FACULTY',
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'demo.faculty.unassigned@dev.local',
    fullName: 'Dr. Neha Tiwari',
    primaryRole: 'FACULTY',
    departmentCode: 'CSE',
    group: 'Faculty / Supervisors',
    description: 'Faculty Member without Active Supervision Load',
  },
  {
    key: 'DC_CSE',
    id: '66666666-6666-6666-6666-666666666666',
    email: 'demo.dc.cse@dev.local',
    fullName: 'Dr. Sunita Rao',
    primaryRole: 'DC',
    departmentCode: 'CSE',
    group: 'Department Authorities',
    description: 'Department Coordinator / DCEC Maker (CSE)',
  },
  {
    key: 'DC_ECE',
    id: '66666666-eeee-6666-eeee-666666666666',
    email: 'demo.dc.ece@dev.local',
    fullName: 'Dr. Alok Mishra',
    primaryRole: 'DC',
    departmentCode: 'ECE',
    group: 'Department Authorities',
    description: 'Department Coordinator / DCEC Maker (ECE)',
  },
  {
    key: 'DHOD_CSE',
    id: '77777777-7777-7777-7777-777777777777',
    email: 'demo.dhod.cse@dev.local',
    fullName: 'Dr. Vikram Malhotra',
    primaryRole: 'DHOD',
    departmentCode: 'CSE',
    group: 'Department Authorities',
    description: 'Deputy HOD & Supervisor Allocator (CSE)',
  },
  {
    key: 'HOD_CSE',
    id: '88888888-8888-8888-8888-888888888888',
    email: 'demo.hod.cse@dev.local',
    fullName: 'Prof. Dr. Ananya Sen',
    primaryRole: 'HOD',
    departmentCode: 'CSE',
    group: 'Department Authorities',
    description: 'Head of Department & DCEC Chair (CSE)',
  },
  {
    key: 'HOD_ECE',
    id: '88888888-eeee-8888-eeee-888888888888',
    email: 'demo.hod.ece@dev.local',
    fullName: 'Prof. Dr. Sandeep Reddy',
    primaryRole: 'HOD',
    departmentCode: 'ECE',
    group: 'Department Authorities',
    description: 'Head of Department & DCEC Chair (ECE)',
  },
  {
    key: 'PANEL_A',
    id: '99999999-9999-9999-9999-999999999999',
    email: 'demo.panel.a@dev.local',
    fullName: 'Dr. Manish Gupta',
    primaryRole: 'PANEL_MEMBER',
    departmentCode: 'CSE',
    group: 'Defense / Evaluation',
    description: 'Oral Defense Panel Member A (CSE)',
  },
  {
    key: 'PANEL_B',
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'demo.panel.b@dev.local',
    fullName: 'Dr. Sneha Joshi',
    primaryRole: 'PANEL_MEMBER',
    departmentCode: 'CSE',
    group: 'Defense / Evaluation',
    description: 'Oral Defense Panel Member B (CSE)',
  },
  {
    key: 'DCEC_MEMBER',
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    email: 'demo.dcec.member@dev.local',
    fullName: 'Dr. Kavin Mehta',
    primaryRole: 'DCEC_MEMBER',
    departmentCode: 'CSE',
    group: 'Defense / Evaluation',
    description: 'Departmental Committee Reviewer (CSE)',
  },
  {
    key: 'ADMIN_USR',
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'demo.admin@dev.local',
    fullName: 'System Administrator',
    primaryRole: 'ADMIN',
    departmentCode: 'GLOBAL',
    group: 'Administration',
    description: 'Technical Infrastructure & System Administrator',
  },
] as const;

/**
 * Resolves a development persona by key against the fixed allowlist.
 * Returns undefined if the key is unknown.
 */
export function getPersonaByKey(key: string): DevelopmentPersona | undefined {
  return DEVELOPMENT_PERSONAS.find((p) => p.key === key);
}

/**
 * Returns safe persona information formatted for UI presentation.
 */
export function getSafePersonaList(): SafePersonaDisplay[] {
  return DEVELOPMENT_PERSONAS.map(({ key, fullName, primaryRole, departmentCode, group, description }) => ({
    key,
    fullName,
    primaryRole,
    departmentCode,
    group,
    description,
  }));
}
