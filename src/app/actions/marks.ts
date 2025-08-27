
'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import type { MarkEntry, MarksSubmissionPayload, SubmitMarksResult, GetMarksResult } from '@/types/marks';
import { marksSubmissionPayloadSchema } from '@/types/marks';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import type { SchoolClass, SchoolClassSubject } from '@/types/classes';

export async function submitMarks(payload: MarksSubmissionPayload): Promise<SubmitMarksResult> {
  try {
    const validatedPayloadStructure = marksSubmissionPayloadSchema.safeParse(payload);
    if (!validatedPayloadStructure.success) {
      const errors = validatedPayloadStructure.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { success: false, message: 'Validation failed for payload structure.', error: errors };
    }

    const {
      classId, className, subjectId, subjectName,
      academicYear, markedByTeacherId, schoolId, studentMarks
    } = validatedPayloadStructure.data;

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<Omit<MarkEntry, '_id'>>('marks');

    if (!ObjectId.isValid(classId) || !ObjectId.isValid(schoolId) || !ObjectId.isValid(markedByTeacherId)) {
        return { success: false, message: 'Invalid ID format for class, school, or teacher.', error: 'Invalid ID format.' };
    }
    for (const sm of studentMarks) {
        if(!ObjectId.isValid(sm.studentId)) {
            return { success: false, message: `Invalid Student ID format: ${sm.studentId}`, error: 'Invalid Student ID.'}
        }
         if (!sm.assessmentName || sm.assessmentName.trim() === "") {
            return { success: false, message: `Assessment name missing for student ${sm.studentName}.`, error: 'Missing assessment name in student marks.'}
        }
    }

    const operations = studentMarks.map(sm => {
      const markFieldsToSet = {
        studentId: new ObjectId(sm.studentId),
        studentName: sm.studentName,
        classId: classId,
        className: className,
        subjectId: subjectId,
        subjectName: subjectName,
        assessmentName: sm.assessmentName,
        academicYear: academicYear,
        marksObtained: sm.marksObtained,
        maxMarks: sm.maxMarks,
        markedByTeacherId: new ObjectId(markedByTeacherId),
        schoolId: new ObjectId(schoolId),
      };

      return {
        updateOne: {
          filter: {
            studentId: markFieldsToSet.studentId,
            classId: markFieldsToSet.classId,
            subjectId: markFieldsToSet.subjectId,
            assessmentName: markFieldsToSet.assessmentName,
            academicYear: markFieldsToSet.academicYear,
            schoolId: markFieldsToSet.schoolId,
          },
          update: {
            $set: {
              studentName: markFieldsToSet.studentName,
              className: markFieldsToSet.className,
              subjectName: markFieldsToSet.subjectName,
              marksObtained: markFieldsToSet.marksObtained,
              maxMarks: markFieldsToSet.maxMarks,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              studentId: markFieldsToSet.studentId,
              classId: markFieldsToSet.classId,
              subjectId: markFieldsToSet.subjectId,
              assessmentName: markFieldsToSet.assessmentName,
              academicYear: markFieldsToSet.academicYear,
              schoolId: markFieldsToSet.schoolId,
              markedByTeacherId: markFieldsToSet.markedByTeacherId,
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    if (operations.length === 0) {
        return { success: true, message: "No marks data provided to submit.", count: 0};
    }

    const result = await marksCollection.bulkWrite(operations);
    let processedCount = result.upsertedCount + result.modifiedCount;

    revalidatePath('/dashboard/teacher/marks');
    revalidatePath('/dashboard/admin/reports/generate-cbse-state');
    revalidatePath('/dashboard/admin/reports/generate-nursing');

    return {
      success: true,
      message: `Successfully saved marks for ${processedCount} assessment entries.`,
      count: processedCount,
    };

  } catch (error) {
    console.error('Submit marks server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during marks submission.', error: errorMessage };
  }
}

export async function getMarksForAssessment(
  schoolId: string,
  classId: string,
  subjectNameParam: string,
  assessmentNameBase: string,
  academicYear: string
): Promise<GetMarksResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid School or Class ID format.', error: 'Invalid ID format.' };
    }

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<MarkEntry>('marks');

    let queryAssessmentFilter: { $regex: string } | { $in: string[] };

    if (["FA1", "FA2", "FA3", "FA4"].includes(assessmentNameBase)) {
      queryAssessmentFilter = { $regex: `^${assessmentNameBase}-Tool` };
    } else if (["SA1", "SA2"].includes(assessmentNameBase)) {
      queryAssessmentFilter = { $regex: `^${assessmentNameBase}-Paper` };
    } else {
      // For Nursing College terms or other specific assessments
      queryAssessmentFilter = { $in: [assessmentNameBase] };
    }

    const marks = await marksCollection.find({
      schoolId: new ObjectId(schoolId),
      classId: classId,
      subjectId: subjectNameParam,
      assessmentName: queryAssessmentFilter,
      academicYear: academicYear,
    }).toArray();

    const marksWithStrId = marks.map(mark => ({
        ...mark,
        _id: mark._id!.toString(),
        studentId: mark.studentId.toString(),
        markedByTeacherId: mark.markedByTeacherId.toString(),
        schoolId: mark.schoolId.toString(),
        classId: mark.classId.toString(),
    }));

    return { success: true, marks: marksWithStrId };

  } catch (error) {
    console.error('Get marks server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch marks.' };
  }
}


export interface SubjectForTeacher {
  value: string; // Composite key for Select: "classId_subjectName"
  label: string; // Display label: "Subject Name (ClassName - Section)"
  classId: string;
  className: string;
  subjectName: string;
}

export interface AssignedClassInfo {
  id: string; // class _id
  name: string; // "ClassName - Section"
}

// RENAMED and REFACTORED from getSubjectsForTeacher
export async function getAssignedClassesForUser(userId: string, schoolId: string, assignedClassIds: string[]): Promise<AssignedClassInfo[]> {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(schoolId)) {
        console.warn("getAssignedClassesForUser: Invalid userId or schoolId format provided.");
        return [];
    }
    if (!assignedClassIds || assignedClassIds.length === 0) {
        return [];
    }

    try {
        const { db } = await connectToDatabase();
        const schoolClassesCollection = db.collection<Omit<SchoolClass, '_id' | 'schoolId'> & { _id: ObjectId; schoolId: ObjectId }>('school_classes');
        
        const classObjectIds = assignedClassIds.map(id => new ObjectId(id));
        
        const classes = await schoolClassesCollection.find({
            _id: { $in: classObjectIds },
            schoolId: new ObjectId(schoolId)
        }).toArray();

        return classes.map(cls => ({
            id: cls._id.toString(),
            name: `${cls.name}${cls.section ? ` - ${cls.section}` : ''}`
        }));

    } catch (error) {
        console.error("Error fetching assigned classes for user:", error);
        return [];
    }
}


export async function getSubjectsForTeacher(teacherId: string, schoolId: string): Promise<SubjectForTeacher[]> {
    if (!ObjectId.isValid(teacherId) || !ObjectId.isValid(schoolId)) {
        console.warn("getSubjectsForTeacher: Invalid teacherId or schoolId format provided.");
        return [];
    }
    try {
        const { db } = await connectToDatabase();
        const schoolClassesCollection = db.collection<Omit<SchoolClass, '_id' | 'schoolId'> & { _id: ObjectId; schoolId: ObjectId }>('school_classes');

        const schoolObjectId = new ObjectId(schoolId);

        const classesInSchool = await schoolClassesCollection.find({ schoolId: schoolObjectId }).toArray();

        const taughtSubjects: SubjectForTeacher[] = [];

        classesInSchool.forEach(cls => {
            const classSubjects = (cls.subjects || []) as SchoolClassSubject[];

            classSubjects.forEach(subject => {
                let isMatch = false;
                if (subject.teacherId) {
                    const subjectTeacherIdStr = typeof subject.teacherId === 'string' ? subject.teacherId : subject.teacherId?.toString();
                    isMatch = subjectTeacherIdStr === teacherId;
                }

                if (isMatch) {
                    const uniqueValue = `${cls._id.toString()}_${subject.name}`;
                    if (!taughtSubjects.some(ts => ts.value === uniqueValue)) {
                        taughtSubjects.push({
                            value: uniqueValue,
                            label: `${subject.name} (${cls.name}${cls.section ? ` - ${cls.section}` : ''})`,
                            classId: cls._id.toString(),
                            className: cls.name,
                            subjectName: subject.name
                        });
                    }
                }
            });
        });

        return taughtSubjects.sort((a, b) => a.label.localeCompare(b.label));

    } catch (error) {
        console.error("Error fetching subjects for teacher:", error);
        return [];
    }
}

export async function getStudentMarksForReportCard(studentId: string, schoolId: string, academicYear: string, classId: string, term?: string): Promise<GetMarksResult> {
  try {
    if (!ObjectId.isValid(studentId) || !ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid Student, School, or Class ID format.', error: 'Invalid ID format.' };
    }

    const { db } = await connectToDatabase();
    const marksCollection = db.collection<MarkEntry>('marks');

    const query: any = {
      studentId: new ObjectId(studentId),
      schoolId: new ObjectId(schoolId),
      classId: classId,
      academicYear: academicYear,
    };
    
    // If a term is provided, filter marks by assessment names relevant to that term.
    if (term) {
        if (term === 'Annual') {
            query.assessmentName = { $regex: /^(FA|SA)/ }; // All FA and SA marks for annual CBSE
        } else if (['Term 1', 'Term 2', 'Term 3', 'Final Exam'].includes(term)) { // Updated this line
             query.assessmentName = term; // For Nursing template
        }
    }


    const marks = await marksCollection.find(query).toArray();

    const marksWithStrId = marks.map(mark => ({
        ...mark,
        _id: mark._id!.toString(),
        studentId: mark.studentId.toString(),
        markedByTeacherId: mark.markedByTeacherId.toString(),
        schoolId: mark.schoolId.toString(),
        classId: mark.classId.toString(),
    }));

    return { success: true, marks: marksWithStrId };

  } catch (error) {
    console.error('Get student marks for report card error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch marks for report card.' };
  }
}

export interface AvailableYearsAndTerms {
  [year: string]: string[];
}
export interface GetAvailableYearsAndTermsResult {
  success: boolean;
  data?: AvailableYearsAndTerms;
  message?: string;
  error?: string;
}

// New action to get available academic years and terms for a student
export async function getAvailableYearsAndTermsForStudent(studentId: string, schoolId: string): Promise<GetAvailableYearsAndTermsResult> {
  try {
    if (!ObjectId.isValid(studentId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid Student or School ID format.' };
    }

    const { db } = await connectToDatabase();
    
    const results = await db.collection('marks').aggregate([
      { $match: { studentId: new ObjectId(studentId), schoolId: new ObjectId(schoolId) } },
      {
        $group: {
          _id: {
            academicYear: '$academicYear',
            assessmentName: '$assessmentName'
          }
        }
      },
      {
        $project: {
          _id: 0,
          academicYear: '$_id.academicYear',
          assessmentName: '$_id.assessmentName'
        }
      }
    ]).toArray();
    
    const availableData: AvailableYearsAndTerms = {};
    
    results.forEach(item => {
      const year = item.academicYear;
      const assessment = item.assessmentName;
      
      if (!availableData[year]) {
        availableData[year] = [];
      }
      
      let term: string | null = null;
      if (assessment && (assessment.startsWith('FA') || assessment.startsWith('SA'))) {
        term = 'Annual'; // Group all CBSE marks under one term
      } else if (assessment && ['Term 1', 'Term 2', 'Term 3', 'Final Exam'].includes(assessment)) {
        term = assessment;
      }

      if (term && !availableData[year].includes(term)) {
        availableData[year].push(term);
      }
    });

    return { success: true, data: availableData };

  } catch (error) {
    console.error('Error fetching available years and terms:', error);
    return { success: false, message: 'Failed to fetch available academic terms.', error: String(error) };
  }
}


    