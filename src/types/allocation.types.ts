// Supervisor Allocation & D.HOD Workbench Domain Types

export interface StudentPreferenceDetail {
  preference_rank: number;
  faculty_id: string;
  faculty_name: string;
  designation: string;
  active_guide_load: number;
  active_coguide_load: number;
  is_available: boolean;
}

export interface AllocationQueueItem {
  thesis_id: string;
  tracking_number: string;
  department_id: string;
  student_id: string;
  student_name: string;
  student_roll_number: string;
  proposed_title: string | null;
  broad_domain: string | null;
  problem_statement: string | null;
  expected_outcomes: string | null;
  current_state: string;
  current_stage: string;
  approved_at: string | null;
  guide_id: string | null;
  guide_name: string | null;
  co_guide_id: string | null;
  co_guide_name: string | null;
  student_preferences: StudentPreferenceDetail[];
}

export interface FacultyAllocationOption {
  faculty_id: string;
  full_name: string;
  employee_code: string;
  designation: string;
  department_id: string;
  active_guide_load: number;
  active_coguide_load: number;
  is_available: boolean;
  is_active: boolean;
}

export interface AllocateSupervisorsInput {
  thesis_id: string;
  guide_id: string;
  co_guide_id: string;
  client_ip?: string;
  user_agent?: string;
}

export interface ReallocateSupervisorsInput {
  thesis_id: string;
  new_guide_id: string;
  new_co_guide_id: string;
  justification: string;
  client_ip?: string;
  user_agent?: string;
}

export interface AllocationResult {
  success: boolean;
  allocation_id: string;
  thesis_id: string;
  guide_id: string;
  co_guide_id: string;
  current_state: string;
  current_stage: string;
  allocated_at: string;
}

export interface ReallocationResult {
  success: boolean;
  history_id: string;
  thesis_id: string;
  previous_guide_id: string;
  previous_co_guide_id: string;
  new_guide_id: string;
  new_co_guide_id: string;
  justification: string;
  reallocated_at: string;
}
