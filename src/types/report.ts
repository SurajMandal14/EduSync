
import type { ObjectId } from 'mongodb';
import type { ReportCardTemplateKey } from './school';
import type { StudentData as FrontStudentData, MarksEntry as FrontMarksEntryType } from '@/components/report-cards/CBSEStateFront'; // Renamed MarksEntry to avoid conflict
// Removed BackSARowData and BackAttendanceMonthData imports as their structures will be defined here or derived

// Define a structure for storing FA marks that includes the subject identifier
export interface FormativeAssessmentEntryForStorage {
  subjectName: string;
  fa1: FrontMarksEntryType;
  fa2: FrontMarksEntry_type;
  fa3: FrontMarksEntryType;
  fa4: FrontMarksEntryType;
}

// New Structure for SA Paper Scores
export interface SAPaperScore {
  marks: number | null;
  maxMarks: number | null;
}

// New Structure for SA data per subject/paper row for storage and display
export interface ReportCardSASubjectEntry {
  subjectName: string; // e.g., "Telugu", "Hindi", "English", "Maths", "Science", "Social"
  paper: string; // e.g., "I", "II" for most, or "Physics", "Biology" for Science papers
  sa1: SAPaperScore;
  sa2: SAPaperScore;
  faTotal200M: number | null; // This is the sum of FA1-FA4 (200M total from FA marks table)
}

// Structure for Attendance data for storage and display (can remain similar)
export interface ReportCardAttendanceMonth {
  workingDays: number | null;
  presentDays: number | null;
}


export interface ReportCardData {
  _id?: ObjectId | string;
  studentId: string; // Reference to the User._id of the student
  schoolId: ObjectId | string; // Reference to the School._id
  reportCardTemplateKey: ReportCardTemplateKey; // e.g., 'cbse_state'
  
  studentInfo: FrontStudentData;
  formativeAssessments: FormativeAssessmentEntryForStorage[];
  coCurricularAssessments: any[]; // Using 'any[]' as coCurricularAssessments was empty and structure may change. Using FrontCoCurricularSAData causes type issues in page.
  secondLanguage?: 'Hindi' | 'Telugu';

  summativeAssessments: ReportCardSASubjectEntry[]; // UPDATED STRUCTURE
  attendance: ReportCardAttendanceMonth[]; // UPDATED STRUCTURE
  finalOverallGrade: string | null;

  isPublished?: boolean;
  generatedByAdminId?: ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
  term?: string;
}

export interface SaveReportCardResult {
  success: boolean;
  message: string;
  error?: string;
  reportCardId?: string;
  isPublished?: boolean;
}

export interface SetReportCardPublicationStatusResult {
    success: boolean;
    message: string;
    error?: string;
    isPublished?: boolean;
}

export interface GetStudentReportCardResult {
  success: boolean;
  reportCard?: ReportCardData;
  message?: string;
  error?: string;
}

export interface BulkPublishReportInfo {
  reportId: string | null;
  studentId: string;
  studentName: string;
  registrationNo?: string;
  isPublished: boolean;
  hasReport: boolean;
  term: string;
}
