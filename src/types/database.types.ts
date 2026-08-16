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
  roll_number: string;
  enrollment_number: string;
  program_id: string;
  department_id: string;
  batch_name: string;
  current_semester: number;
  is_eligible: boolean;
  created_at: string;
}

export interface FacultyProfile {
  user_id: string;
  employee_code: string;
  designation: string;
  department_id: string;
  active_guide_load: number;
  active_coguide_load: number;
  is_available: boolean;
  created_at: string;
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

export interface Thesis {
  id: string;
  tracking_number: string;
  student_id: string;
  department_id: string;
  session_id: string;
  current_state: string;
  current_stage: string;
  guide_id: string | null;
  co_guide_id: string | null;
  defense_cycle_index: number;
  created_at: string;
  updated_at: string;
}

export interface ThesisTitle {
  id: string;
  thesis_id: string;
  proposed_title: string;
  final_approved_title: string | null;
  normalized_title: string;
  is_approved: boolean;
  approved_at: string | null;
}

export interface ThesisWithActiveTitle extends Thesis {
  active_title: string | null;
}

export interface Annexure6Evaluation {
  id: string;
  thesis_id: string;
  guide_id: string;
  supervisor_score: number;
  regularity_rating: string;
  technical_proficiency: string;
  rigor_rating: string;
  confidential_remarks: string;
  defense_recommendation: 'RECOMMENDED' | 'REVISIONS_REQUIRED' | 'NOT_RECOMMENDED';
  submitted_at: string;
}

export interface ThesisFilterParams {
  studentId?: string;
  guideId?: string;
  departmentId?: string;
  sessionId?: string;
  currentStage?: string;
  currentState?: string;
}

export * from './annexure1.types';
export * from './dcec.types';
export * from './allocation.types';
export * from './annexure2.types';
