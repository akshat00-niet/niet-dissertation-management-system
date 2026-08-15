// Authoritative Application Database and Session Types
// Derived directly from database/migrations/001_... through 018_...

export type RoleType =
  | 'STUDENT'
  | 'FACULTY'
  | 'GUIDE'
  | 'CO_GUIDE'
  | 'DC'
  | 'DHOD'
  | 'HOD'
  | 'PANEL_MEMBER'
  | 'DCEC_CHAIR'
  | 'DCEC_MEMBER'
  | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role_category: 'STUDENT' | 'FACULTY' | 'ADMIN';
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: RoleType;
  department_id: string | null;
  session_id: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface StudentProfile {
  user_id: string;
  department_id: string;
  session_id: string;
  program_id: string;
  batch_id: string;
  section_id: string | null;
  roll_number: string;
  admission_year: number;
  current_semester: number;
  academic_standing: string;
}

export interface FacultyProfile {
  user_id: string;
  department_id: string;
  employee_code: string;
  designation: string;
  max_primary_supervision_load: number;
  max_co_supervision_load: number;
  current_primary_load: number;
  current_co_load: number;
  is_dcec_eligible: boolean;
  is_active: boolean;
}

export interface AppSession {
  authUser: {
    id: string;
    email?: string;
  };
  appUser: User;
  roles: UserRoleAssignment[];
  activeRole: RoleType | null;
  activeDepartmentId: string | null;
  studentProfile: StudentProfile | null;
  facultyProfile: FacultyProfile | null;
}
