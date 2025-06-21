
// Basic User type definition
// This will be expanded as we add more user-specific fields.

import type { ObjectId } from 'mongodb';
import { z } from 'zod';

export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';

export interface User {
  _id: ObjectId | string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  schoolId?: ObjectId | string;
  classId?: string; // For students: class _id they belong to. For teachers: primary class _id they can mark attendance for.
  admissionId?: string; 
  avatarUrl?: string;
  phone?: string;
  busRouteLocation?: string; // For students using bus transport
  busClassCategory?: string; // For students using bus transport, to match specific bus fee tier
  subjectsTaught?: string[]; // For teachers, list of subject names or IDs they teach (Future use)
  
  // New fields for student report card
  fatherName?: string;
  motherName?: string;
  dob?: string; // Store as string for simplicity, can be Date if strict typing needed
  section?: string; // Student's section, potentially derived from class
  rollNo?: string;
  examNo?: string;
  aadharNo?: string;

  createdAt: Date | string; // Allow string for client-side
  updatedAt: Date | string; // Allow string for client-side
}

// Centralized AuthUser type
export type AuthUser = Pick<User, 'email' | 'name' | 'role' | '_id' | 'schoolId' | 'classId' | 'avatarUrl' | 'admissionId'>;


// Zod schema for Super Admin creating/updating School Admins
export const schoolAdminFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional().or(z.literal('')), // Optional for update
  schoolId: z.string().min(1, { message: "School selection is required." }),
});
export type SchoolAdminFormData = z.infer<typeof schoolAdminFormSchema>;


// Zod schema for admin creating students
export const createStudentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  admissionId: z.string().min(1, { message: "Admission ID is required for students."}),
  classId: z.string().min(1, { message: "Class assignment is required." }), // This will be the class _id
  enableBusTransport: z.boolean().default(false).optional(),
  busRouteLocation: z.string().optional(),
  busClassCategory: z.string().optional(),
  // New fields for student
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  dob: z.string().optional(), 
  section: z.string().optional(), // Section might be auto-populated based on class
  rollNo: z.string().optional(),
  examNo: z.string().optional(),
  aadharNo: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), {
    message: "Aadhar Number must be exactly 12 digits.",
  }),
}).refine(data => {
  if (data.enableBusTransport && (!data.busRouteLocation || !data.busClassCategory)) {
    return false;
  }
  return true;
}, {
  message: "Bus Location and Class Category are required if bus transport is enabled.",
  path: ["busRouteLocation"], 
});
export type CreateStudentFormData = z.infer<typeof createStudentFormSchema>;

// Zod schema for admin creating teachers
export const createTeacherFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  classId: z.string().optional(), // Optional: if teacher is also a class teacher for a specific class (this will be their primary attendance class _id)
});
export type CreateTeacherFormData = z.infer<typeof createTeacherFormSchema>;


// Generic Zod schema for admin creating school users (teachers, students) - used by server action
export const createSchoolUserFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(['teacher', 'student'], { required_error: "Role is required." }),
  classId: z.string().optional(), // This will be class _id
  admissionId: z.string().optional(),
  busRouteLocation: z.string().optional(),
  busClassCategory: z.string().optional(),
  // New fields for student
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  dob: z.string().optional(),
  section: z.string().optional(),
  rollNo: z.string().optional(),
  examNo: z.string().optional(),
  aadharNo: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), {
    message: "Aadhar Number must be exactly 12 digits.",
  }),
}).refine(data => {
  if (data.role === 'student' && (!data.admissionId || data.admissionId.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Admission ID is required for students and cannot be empty.",
  path: ["admissionId"],
});
export type CreateSchoolUserFormData = z.infer<typeof createSchoolUserFormSchema>;


// Zod schema for admin updating school users (teachers, students)
export const updateSchoolUserFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "New password must be at least 6 characters." }).optional().or(z.literal('')), // Optional for update
  role: z.enum(['teacher', 'student'], { required_error: "Role is required." }), 
  classId: z.string().optional(), // This will be class _id
  admissionId: z.string().optional(), 
  enableBusTransport: z.boolean().default(false).optional(),
  busRouteLocation: z.string().optional(),
  busClassCategory: z.string().optional(),
  // New fields for student
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  dob: z.string().optional(),
  section: z.string().optional(),
  rollNo: z.string().optional(),
  examNo: z.string().optional(),
  aadharNo: z.string().optional().refine(val => !val || /^\d{12}$/.test(val), {
    message: "Aadhar Number must be exactly 12 digits.",
  }),
}).refine(data => {
  if (data.role === 'student' && data.enableBusTransport && (!data.busRouteLocation || !data.busClassCategory)) {
    return false;
  }
  return true;
}, {
  message: "Bus Location and Class Category are required if bus transport is enabled for student.",
  path: ["busRouteLocation"],
});
export type UpdateSchoolUserFormData = z.infer<typeof updateSchoolUserFormSchema>;


// Added for school admin creating teachers/students (used by createSchoolUser action parameter)
export interface CreateSchoolUserServerActionFormData {
  name: string;
  email: string;
  password: string; // Required for create by server action
  role: 'teacher' | 'student';
  classId?: string; // This will be class _id
  admissionId?: string;
  busRouteLocation?: string;
  busClassCategory?: string;
  // New fields for student
  fatherName?: string;
  motherName?: string;
  dob?: string;
  section?: string; // From class
  rollNo?: string;
  examNo?: string;
  aadharNo?: string;
}


// Schema for updating basic profile info (name, phone, avatar)
export const updateProfileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().optional(),
  avatarUrl: z.string().url("Invalid URL format for avatar.").optional().or(z.literal('')),
});
export type UpdateProfileFormData = z.infer<typeof updateProfileFormSchema>;
