import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type {
  AppSession,
  StudentProfile,
  FacultyProfile,
} from '@/types/database.types';
import {
  getStudentProfileByUserId,
  getFacultyProfileByUserId,
} from '@/lib/dal/profiles.dal';
import { NotFoundError, ValidationError } from '@/lib/dal/errors';

export interface UserProfileResponse {
  userId: string;
  roleCategory: string;
  studentProfile: StudentProfile | null;
  facultyProfile: FacultyProfile | null;
}

/**
 * Service to retrieve the full academic profile for the authenticated caller.
 */
export async function getCallerAcademicProfile(
  session: AppSession,
  client?: SupabaseClient
): Promise<UserProfileResponse> {
  const supabase = client || createClient();
  const userId = session.authUser.id;

  if (session.appUser.role_category === 'STUDENT') {
    const studentProfile = await getStudentProfileByUserId(supabase, userId);
    if (!studentProfile) {
      throw new NotFoundError('Student Profile for User', userId);
    }
    return {
      userId,
      roleCategory: 'STUDENT',
      studentProfile,
      facultyProfile: null,
    };
  }

  if (session.appUser.role_category === 'FACULTY') {
    const facultyProfile = await getFacultyProfileByUserId(supabase, userId);
    if (!facultyProfile) {
      throw new NotFoundError('Faculty Profile for User', userId);
    }
    return {
      userId,
      roleCategory: 'FACULTY',
      studentProfile: null,
      facultyProfile,
    };
  }

  return {
    userId,
    roleCategory: session.appUser.role_category,
    studentProfile: null,
    facultyProfile: null,
  };
}

/**
 * Service to retrieve academic profile for any specified user (subject to RLS visibility).
 */
export async function getUserAcademicProfile(
  session: AppSession,
  targetUserId: string,
  client?: SupabaseClient
): Promise<UserProfileResponse> {
  if (!targetUserId || typeof targetUserId !== 'string') {
    throw new ValidationError('A valid target user UUID is required.');
  }

  const supabase = client || createClient();

  const studentProfile = await getStudentProfileByUserId(supabase, targetUserId);
  const facultyProfile = await getFacultyProfileByUserId(supabase, targetUserId);

  if (!studentProfile && !facultyProfile) {
    throw new NotFoundError('Academic Profile for User', targetUserId);
  }

  return {
    userId: targetUserId,
    roleCategory: studentProfile ? 'STUDENT' : 'FACULTY',
    studentProfile,
    facultyProfile,
  };
}
