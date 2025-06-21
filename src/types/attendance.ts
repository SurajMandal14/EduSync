
import type { ObjectId } from 'mongodb';
import type { AuthUser as CentralAuthUser } from './user'; // Import central AuthUser

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
}

export interface AttendanceSubmissionPayload {
  classId: string; // Actual Class _id
  className: string; // Human-readable class name
  schoolId: string;
  date: Date;
  entries: AttendanceEntry[];
  markedByTeacherId: string;
}

export interface AttendanceRecord {
  _id: ObjectId | string;
  studentId: string; 
  studentName: string;
  classId: ObjectId | string; // Actual Class _id stored in DB
  className: string; // Human-readable class name stored in DB
  schoolId: ObjectId | string;
  date: Date;
  status: AttendanceStatus;
  markedByTeacherId: ObjectId | string;
  markedByTeacherName?: string; 
  createdAt: Date;
  updatedAt: Date;
}

// Use the centrally defined AuthUser
export type AuthUser = CentralAuthUser;

export interface DailyAttendanceOverview {
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}
