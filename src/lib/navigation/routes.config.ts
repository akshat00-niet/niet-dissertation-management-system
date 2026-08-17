import type { RoleType, UserRoleAssignment } from '@/types/database.types';

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  description?: string;
  allowedRoles?: RoleType[];
  badge?: string;
  isConfidentialEvaluation?: boolean; // Strictly excluded from STUDENT role
}

export interface NavSectionConfig {
  id: string;
  title: string;
  allowedRoles?: RoleType[];
  items: NavItemConfig[];
}

export const APP_NAVIGATION_CONFIG: NavSectionConfig[] = [
  {
    id: 'general',
    title: 'Workspace',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard Overview',
        href: '/app',
        description: 'Session overview and assigned academic responsibilities',
      },
    ],
  },
  {
    id: 'student-portal',
    title: 'Candidate Workspace',
    allowedRoles: ['STUDENT'],
    items: [
      {
        id: 'student-dissertation',
        label: 'My Dissertation',
        href: '/app/student/dissertation',
        allowedRoles: ['STUDENT'],
        description: 'Active dissertation record and milestone status',
      },
      {
        id: 'student-annexure-1',
        label: 'Annexure 1 (Proposal)',
        href: '/app/student/annexure-1',
        allowedRoles: ['STUDENT'],
        description: 'Title proposal and ranked supervisor preferences',
      },
      {
        id: 'student-annexure-2',
        label: 'Annexure 2 (Title Approval)',
        href: '/app/student/annexure-2',
        allowedRoles: ['STUDENT'],
        description: 'Formal dissertation title approval docket',
      },
      {
        id: 'student-logbook',
        label: 'Annexure 4 (Logbook)',
        href: '/app/student/logbook',
        allowedRoles: ['STUDENT'],
        description: 'Digital supervisory interaction logbook',
      },
      {
        id: 'student-annexure-5',
        label: 'Annexure 5 (Final Submission)',
        href: '/app/student/annexure-5',
        allowedRoles: ['STUDENT'],
        description: 'Final manuscript and Turnitin similarity report',
      },
      {
        id: 'student-defenses',
        label: 'Progress & Defenses',
        href: '/app/student/defenses',
        allowedRoles: ['STUDENT'],
        description: 'Milestone presentations (P1, P2, P3) and Viva defense',
      },
    ],
  },
  {
    id: 'supervisor-portal',
    title: 'Supervisor Workspace',
    allowedRoles: ['GUIDE', 'CO_GUIDE', 'FACULTY'],
    items: [
      {
        id: 'guide-theses',
        label: 'Supervised Theses',
        href: '/app/guide/theses',
        allowedRoles: ['GUIDE', 'CO_GUIDE', 'FACULTY'],
        description: 'Active candidate supervision roster',
      },
      {
        id: 'guide-endorsements',
        label: 'Pending Endorsements',
        href: '/app/guide/endorsements',
        allowedRoles: ['GUIDE', 'CO_GUIDE'],
        description: 'Annexure 2 and Annexure 5 sign-offs',
      },
      {
        id: 'guide-logbook',
        label: 'Logbook Verifications',
        href: '/app/guide/logbook',
        allowedRoles: ['GUIDE', 'CO_GUIDE', 'FACULTY'],
        description: 'Review and verify Annexure 4 meeting entries',
      },
      {
        id: 'guide-annexure-5',
        label: 'Annexure 5 (Submissions)',
        href: '/app/guide/annexure-5',
        allowedRoles: ['GUIDE', 'CO_GUIDE', 'FACULTY'],
        description: 'Review final dissertation manuscripts and Turnitin reports',
      },
      {
        id: 'guide-annexure-6',
        label: 'Annexure 6 (Evaluation)',
        href: '/app/guide/annexure-6',
        allowedRoles: ['GUIDE', 'HOD', 'DCEC_CHAIR'],
        description: 'Confidential supervisor evaluation and scoring',
        isConfidentialEvaluation: true,
        badge: 'Confidential',
      },
    ],
  },
  {
    id: 'department-portal',
    title: 'Department Academic Authority',
    allowedRoles: ['DC', 'DHOD', 'HOD', 'DCEC_MEMBER', 'DCEC_CHAIR'],
    items: [
      {
        id: 'dc-screening',
        label: 'DC Screening Queue',
        href: '/app/dc/screening',
        allowedRoles: ['DC'],
        description: 'Verify candidate eligibility, documentation, and compile dockets',
      },
      {
        id: 'dept-screening',
        label: 'DCEC Proposal Review',
        href: '/app/dcec/screening',
        allowedRoles: ['HOD', 'DHOD', 'DCEC_MEMBER', 'DCEC_CHAIR'],
        description: 'Review proposal screening dockets and record binding decisions',
      },
      {
        id: 'dept-allocations',
        label: 'Guide Allocation Workbench',
        href: '/app/department/allocations',
        allowedRoles: ['DHOD', 'HOD'],
        description: 'Manual supervisor allocation and capacity tracking (≤3)',
      },
      {
        id: 'dept-title-approvals',
        label: 'DCEC Title Approvals',
        href: '/app/dcec/title-approvals',
        allowedRoles: ['HOD', 'DHOD', 'DCEC_MEMBER', 'DCEC_CHAIR'],
        description: 'Review dual-endorsed Annexure 2 title approval dockets',
      },
      {
        id: 'dc-milestones',
        label: 'DC Milestone Scheduling',
        href: '/app/dc/milestones',
        allowedRoles: ['DC', 'HOD'],
        description: 'Schedule P1, P2, and P3 milestone presentation sessions',
      },
      {
        id: 'dcec-milestones',
        label: 'DCEC Milestone Evaluations',
        href: '/app/dcec/milestones',
        allowedRoles: ['HOD', 'DHOD', 'DCEC_MEMBER', 'DCEC_CHAIR'],
        description: 'Review and evaluate scheduled milestone presentations',
      },
      {
        id: 'dept-milestones',
        label: 'Department Milestones',
        href: '/app/department/milestones',
        allowedRoles: ['HOD', 'DHOD', 'DC', 'DCEC_MEMBER', 'DCEC_CHAIR'],
        description: 'Cohort milestone tracking and performance analytics',
      },
      {
        id: 'dept-annexure-5',
        label: 'Final Submissions (Annexure 5)',
        href: '/app/department/annexure-5',
        allowedRoles: ['HOD', 'DHOD', 'DC', 'DCEC_MEMBER', 'DCEC_CHAIR'],
        description: 'Cohort final dissertation submissions and similarity tracking',
      },
      {
        id: 'dept-annexure-6',
        label: 'Supervisor Evaluations (Annexure 6)',
        href: '/app/department/annexure-6',
        allowedRoles: ['HOD', 'DC', 'DCEC_CHAIR'],
        description: 'Department Annexure 6 confidential evaluation and panel queue',
      },
      {
        id: 'dept-defense-panels',
        label: 'Oral Defense Panels',
        href: '/app/department/defense-panels',
        allowedRoles: ['HOD', 'DHOD', 'DC', 'DCEC_CHAIR'],
        description: 'Constitute 2-member examination panels and schedule oral defenses',
      },
      {
        id: 'dept-compliance',
        label: 'Department Overview',
        href: '/app/department/compliance',
        allowedRoles: ['HOD', 'DHOD'],
        description: 'Cohort progression and compliance monitoring',
      },
      {
        id: 'dept-delegations',
        label: 'DCEC Delegations',
        href: '/app/department/delegations',
        allowedRoles: ['HOD'],
        description: 'Manage DCEC Chair authority delegations to D.HOD',
      },
    ],
  },
  {
    id: 'defense-portal',
    title: 'Viva & Evaluation Panels',
    allowedRoles: ['PANEL_MEMBER', 'DCEC_MEMBER', 'HOD', 'DC', 'FACULTY'],
    items: [
      {
        id: 'panel-assignments',
        label: 'Assigned Viva Defenses',
        href: '/app/panel/assignments',
        allowedRoles: ['PANEL_MEMBER', 'FACULTY', 'HOD', 'DC'],
        description: 'Review assigned oral defense examinations and candidate dossiers',
      },
      {
        id: 'defense-sessions',
        label: 'Assigned Defense Sessions',
        href: '/app/defense/sessions',
        allowedRoles: ['PANEL_MEMBER', 'DCEC_MEMBER', 'HOD'],
        description: 'Viva oral examinations and milestone panels',
      },
      {
        id: 'defense-rubrics',
        label: 'Evaluation Rubrics',
        href: '/app/defense/rubrics',
        allowedRoles: ['PANEL_MEMBER', 'DCEC_MEMBER', 'HOD'],
        description: '4-column achievement scoring scorecards',
      },
    ],
  },
  {
    id: 'admin-portal',
    title: 'System Administration',
    allowedRoles: ['ADMIN'],
    items: [
      {
        id: 'admin-users',
        label: 'User Directory & Roles',
        href: '/app/admin/users',
        allowedRoles: ['ADMIN'],
        description: 'Roster accounts and role assignments',
      },
      {
        id: 'admin-departments',
        label: 'Academic Structure',
        href: '/app/admin/departments',
        allowedRoles: ['ADMIN'],
        description: 'Departments, programs, and academic sessions',
      },
      {
        id: 'admin-rubrics',
        label: 'Rubric Builder',
        href: '/app/admin/rubrics',
        allowedRoles: ['ADMIN'],
        description: 'Dynamic scoring rubrics and criteria templates',
      },
      {
        id: 'admin-audit',
        label: 'System Audit Logs',
        href: '/app/admin/audit',
        allowedRoles: ['ADMIN'],
        description: 'Security and immutable lifecycle event log',
      },
    ],
  },
];

/**
 * Filters the master navigation configuration to return only the sections and items
 * authorized for the user's granted roles.
 *
 * NOTE: Navigation filtering is for usability. Server guards and PostgreSQL RLS
 * remain the authoritative authorization boundary.
 */
export function getAuthorizedNavigation(roles: readonly UserRoleAssignment[]): NavSectionConfig[] {
  const grantedRoleIds = new Set(roles.map((r) => r.role_id));
  const result: NavSectionConfig[] = [];

  for (const section of APP_NAVIGATION_CONFIG) {
    // Check if section itself is role-restricted
    if (section.allowedRoles && !section.allowedRoles.some((r) => grantedRoleIds.has(r))) {
      continue;
    }

    // Filter items in section
    const authorizedItems = section.items.filter((item) => {
      // If item has specific role restrictions, user must hold at least one
      if (item.allowedRoles && !item.allowedRoles.some((r) => grantedRoleIds.has(r))) {
        return false;
      }

      // Hard check: Ensure STUDENT role can NEVER receive Annexure 6 evaluation links
      if (
        item.isConfidentialEvaluation &&
        grantedRoleIds.has('STUDENT') &&
        !grantedRoleIds.has('GUIDE') &&
        !grantedRoleIds.has('HOD')
      ) {
        return false;
      }

      return true;
    });

    if (authorizedItems.length > 0) {
      result.push({
        ...section,
        items: authorizedItems,
      });
    }
  }

  return result;
}
