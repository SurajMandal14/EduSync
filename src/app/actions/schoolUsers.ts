
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import type { User, UserRole } from '@/types/user';
import { createSchoolUserFormSchema, type CreateSchoolUserFormData, updateSchoolUserFormSchema, type UpdateSchoolUserFormData, type CreateSchoolUserServerActionFormData } from '@/types/user';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';
import { format, parse } from 'date-fns';


export interface CreateSchoolUserResult {
  success: boolean;
  message: string;
  error?: string;
  user?: Partial<User>;
}

export async function createSchoolUser(values: CreateSchoolUserServerActionFormData, schoolId: string): Promise<CreateSchoolUserResult> {
  try {
    // Validate against the more comprehensive schema that includes student-specific new fields
    const validatedFields = createSchoolUserFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID provided for user creation.', error: 'Invalid School ID.'};
    }

    const { 
        name, email, password, role, classId, admissionId, 
        busRouteLocation, busClassCategory,
        fatherName, motherName, dob, section, rollNo,
        symbolNo, registrationNo, district, gender, quota, classIds
    } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<Omit<User, '_id'>>('users');

    const existingUserByEmail = await usersCollection.findOne({ email });
    if (existingUserByEmail) {
      return { success: false, message: 'User with this email already exists.', error: 'Email already in use.' };
    }

    if (role === 'student' && registrationNo) {
        const existingUserByAdmissionId = await usersCollection.findOne({ registrationNo, schoolId: new ObjectId(schoolId), role: 'student' });
        if (existingUserByAdmissionId) {
            return { success: false, message: `Registration No '${registrationNo}' is already in use for another student in this school.`, error: 'Registration No already taken.' };
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userSchoolId = new ObjectId(schoolId);

    const newUser: Omit<User, '_id' | 'createdAt' | 'updatedAt'> & { createdAt: Date, updatedAt: Date } = {
      name,
      email,
      password: hashedPassword,
      role: role as UserRole,
      schoolId: userSchoolId,
      classId: (classId && classId.trim() !== "" && ObjectId.isValid(classId)) ? classId.trim() : undefined,
      classIds: (classIds && Array.isArray(classIds)) ? classIds : undefined, // For attendance taker
      admissionId: role === 'student' ? (admissionId && admissionId.trim() !== "" ? admissionId.trim() : undefined) : undefined,
      busRouteLocation: role === 'student' ? (busRouteLocation && busRouteLocation.trim() !== "" ? busRouteLocation.trim() : undefined) : undefined,
      busClassCategory: role === 'student' ? (busClassCategory && busClassCategory.trim() !== "" ? busClassCategory.trim() : undefined) : undefined,
      // New fields
      fatherName: role === 'student' ? fatherName : undefined,
      motherName: role === 'student' ? motherName : undefined,
      dob: role === 'student' ? dob : undefined,
      section: role === 'student' ? section : undefined,
      rollNo: role === 'student' ? rollNo : undefined,
      
      symbolNo: role === 'student' ? symbolNo : undefined,
      registrationNo: role === 'student' ? registrationNo : undefined,
      district: role === 'student' ? district : undefined,
      gender: role === 'student' ? gender : undefined,
      quota: role === 'student' ? quota : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    if (!result.insertedId) {
      return { success: false, message: 'Failed to create user.', error: 'Database insertion failed.' };
    }

    revalidatePath('/dashboard/admin/users');
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/teachers');
    revalidatePath('/dashboard/admin/attendancetaker');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = newUser;
    return {
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully!`,
      user: {
        ...userWithoutPassword,
        _id: result.insertedId.toString(),
        schoolId: userSchoolId.toString(),
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      },
    };

  } catch (error) {
    console.error('Create school user server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during user creation.', error: errorMessage };
  }
}

export interface BulkCreateSchoolUsersResult {
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

export async function bulkCreateSchoolUsers(
  students: CreateSchoolUserServerActionFormData[],
  schoolId: string,
  classId: string
): Promise<BulkCreateSchoolUsersResult> {
  if (!ObjectId.isValid(schoolId)) {
    return { success: false, message: 'Invalid School ID.', importedCount: 0, skippedCount: students.length, errors: ['Invalid School ID provided.'] };
  }
  if (!ObjectId.isValid(classId)) {
    return { success: false, message: 'Invalid Class ID.', importedCount: 0, skippedCount: students.length, errors: ['Invalid Class ID provided.'] };
  }

  const { db } = await connectToDatabase();
  const usersCollection = db.collection('users');
  
  const validStudentsToInsert: Omit<User, '_id'>[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  // Fetch all existing registration nos and emails for the school to validate against in memory
  const existingStudents = await usersCollection.find({ schoolId: new ObjectId(schoolId), role: 'student' }).project({ registrationNo: 1, email: 1 }).toArray();
  const existingRegistrationNos = new Set(existingStudents.map(s => s.registrationNo).filter(Boolean));
  const existingEmails = new Set(existingStudents.map(s => s.email));

  for (const student of students) {
    const { name, dob, registrationNo } = student;
    let { email } = student;

    if (!name || !dob) {
      errors.push(`Skipping student '${name || 'N/A'}' due to missing required fields (name, dob).`);
      skippedCount++;
      continue;
    }
    
    if (!registrationNo) {
      errors.push(`Skipping student '${name}' due to missing Registration Number.`);
      skippedCount++;
      continue;
    }

    if (!email) {
      email = `${registrationNo}@school.local`; 
    }

    if (existingEmails.has(email)) {
      errors.push(`Skipping student '${name}' (${email}): Email already exists.`);
      skippedCount++;
      continue;
    }
    if (registrationNo && existingRegistrationNos.has(registrationNo)) {
      errors.push(`Skipping student '${name}' (${email}): Registration No '${registrationNo}' already exists.`);
      skippedCount++;
      continue;
    }

    let password;
    try {
      // Handle various date formats that might come from a spreadsheet
      const parsedDate = parse(dob, 'yyyy-MM-dd', new Date());
      if (isNaN(parsedDate.getTime())) {
          // try another common format
          const parsedDate2 = parse(dob, 'dd-MM-yyyy', new Date());
          if (isNaN(parsedDate2.getTime())) {
            throw new Error('Invalid date format');
          }
          password = format(parsedDate2, 'ddMMyyyy');
      } else {
        password = format(parsedDate, 'ddMMyyyy');
      }
    } catch (e) {
      errors.push(`Skipping student '${name}' (${email}): Invalid or missing DOB for password generation.`);
      skippedCount++;
      continue;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent: Omit<User, '_id'> = {
      ...student,
      email, // Use the original or generated email
      role: 'student',
      password: hashedPassword,
      schoolId: new ObjectId(schoolId),
      classId: classId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    validStudentsToInsert.push(newStudent);
    // Add to sets to prevent duplicates within the same batch
    existingEmails.add(email);
    if(registrationNo) existingRegistrationNos.add(registrationNo);
  }

  if (validStudentsToInsert.length > 0) {
    try {
      await usersCollection.insertMany(validStudentsToInsert as any[]);
    } catch (error) {
      console.error("Bulk insert failed:", error);
      return { success: false, message: 'A database error occurred during bulk insertion.', importedCount: 0, skippedCount: students.length, errors: [...errors, 'Failed to write to database.'] };
    }
  }

  const importedCount = validStudentsToInsert.length;
  let message = `${importedCount} student(s) imported successfully into the selected class.`;
  if (skippedCount > 0) {
    message += ` ${skippedCount} student(s) were skipped.`;
  }
  
  revalidatePath('/dashboard/admin/students');
  revalidatePath('/dashboard/admin/users');

  return { success: true, message, importedCount, skippedCount, errors };
}


export interface GetSchoolUsersResult {
  success: boolean;
  users?: Partial<User>[];
  error?: string;
  message?: string;
}

export async function getSchoolUsers(schoolId: string): Promise<GetSchoolUsersResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
        return { success: false, message: 'Invalid School ID format for fetching users.', error: 'Invalid School ID.'};
    }
    const { db } = await connectToDatabase();

    const usersFromDb = await db.collection('users').find({
      schoolId: new ObjectId(schoolId) as any,
      role: { $in: ['teacher', 'student', 'attendancetaker'] }
    }).sort({ createdAt: -1 }).toArray();

    const users = usersFromDb.map(userDoc => {
      const user = userDoc as unknown as User; 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        _id: user._id.toString(),
        schoolId: user.schoolId?.toString(),
        classId: user.classId || undefined, 
        classIds: user.classIds || undefined,
        admissionId: user.admissionId || undefined,
        busRouteLocation: user.busRouteLocation || undefined,
        busClassCategory: user.busClassCategory || undefined,
        fatherName: user.fatherName,
        motherName: user.motherName,
        dob: user.dob,
        section: user.section,
        rollNo: user.rollNo,
        
        symbolNo: user.symbolNo,
        registrationNo: user.registrationNo,
        district: user.district,
        gender: user.gender,
        quota: user.quota,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : undefined,
      };
    });

    return { success: true, users };
  } catch (error) {
    console.error('Get school users server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch school users.' };
  }
}


export interface UpdateSchoolUserResult {
  success: boolean;
  message: string;
  error?: string;
  user?: Partial<User>;
}

export async function updateSchoolUser(userId: string, schoolId: string, values: UpdateSchoolUserFormData): Promise<UpdateSchoolUserResult> {
  try {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid User or School ID format.', error: 'Invalid ID.' };
    }

    const validatedFields = updateSchoolUserFormSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { success: false, message: 'Validation failed', error: errors || 'Invalid fields!' };
    }

    const { 
        name, email, password, role, classId, admissionId, 
        enableBusTransport, busRouteLocation, busClassCategory,
        fatherName, motherName, dob, section, rollNo, aadharNo,
        symbolNo, registrationNo, district, gender, quota, classIds
    } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
    if (!existingUser || existingUser.schoolId?.toString() !== schoolId) {
      return { success: false, message: 'User not found or does not belong to this school.', error: 'User mismatch.' };
    }

    const existingUserByEmail = await usersCollection.findOne({ email });
    if (existingUserByEmail && existingUserByEmail._id.toString() !== userId) {
      return { success: false, message: 'This email is already in use by another account.', error: 'Email already in use.' };
    }

    if (role === 'student' && registrationNo && registrationNo.trim() !== "") {
        const existingUserByRegistrationNo = await usersCollection.findOne({
            registrationNo,
            schoolId: new ObjectId(schoolId),
            role: 'student',
            _id: { $ne: new ObjectId(userId) as any }
        });
        if (existingUserByRegistrationNo) {
            return { success: false, message: `Registration No '${registrationNo}' is already in use for another student in this school.`, error: 'Registration No already taken.' };
        }
    }

    const setOperation: Partial<User> = {
      name,
      email,
      role,
      updatedAt: new Date(),
    };
    
    // Using a separate object for $unset operation
    const unsetOperation: any = {};

    // Handle password update
    if (password && password.trim() !== "") {
      if (password.length < 6) {
         return { success: false, message: 'Validation failed', error: 'New password must be at least 6 characters.' };
      }
      setOperation.password = await bcrypt.hash(password, 10);
    }
    
    // Handle classId for student/teacher
    if ((role === 'student' || role === 'teacher') && classId && classId.trim() !== "" && ObjectId.isValid(classId)) {
        setOperation.classId = classId.trim();
    } else {
        unsetOperation.classId = "";
    }
    
    // Handle classIds for attendance taker
    if (role === 'attendancetaker' && classIds && Array.isArray(classIds)) {
        setOperation.classIds = classIds;
    } else {
        unsetOperation.classIds = "";
    }

    // Handle role-specific fields
    if (role === 'student') {
        setOperation.admissionId = admissionId;
        setOperation.fatherName = fatherName;
        setOperation.motherName = motherName;
        setOperation.dob = dob;
        setOperation.section = section;
        setOperation.rollNo = rollNo;
        
        setOperation.symbolNo = symbolNo;
        setOperation.registrationNo = registrationNo;
        setOperation.district = district;
        setOperation.gender = gender;
        setOperation.quota = quota;
        
        if (enableBusTransport && busRouteLocation && busClassCategory) {
            setOperation.busRouteLocation = busRouteLocation;
            setOperation.busClassCategory = busClassCategory;
        } else {
            unsetOperation.busRouteLocation = "";
            unsetOperation.busClassCategory = "";
        }
    } else { // It's a teacher or attendance taker, so clear student-specific fields
        unsetOperation.admissionId = "";
        unsetOperation.busRouteLocation = "";
        unsetOperation.busClassCategory = "";
        unsetOperation.fatherName = "";
        unsetOperation.motherName = "";
        unsetOperation.dob = "";
        unsetOperation.section = "";
        unsetOperation.rollNo = "";
        
        unsetOperation.symbolNo = "";
        unsetOperation.registrationNo = "";
        unsetOperation.district = "";
        unsetOperation.gender = "";
        unsetOperation.quota = "";
    }
    
    const updateQuery: any = {};
    if (Object.keys(setOperation).length > 0) {
        updateQuery.$set = setOperation;
    }
    if (Object.keys(unsetOperation).length > 0) {
        updateQuery.$unset = unsetOperation;
    }

    if (Object.keys(updateQuery).length === 0) {
        return { success: true, message: 'No changes detected to update.' };
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) as any, schoolId: new ObjectId(schoolId) as any },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return { success: false, message: 'User not found for update.', error: 'User not found.' };
    }

    revalidatePath('/dashboard/admin/users');
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/teachers');
    revalidatePath('/dashboard/admin/attendancetaker');

    const updatedUserDoc = await usersCollection.findOne({ _id: new ObjectId(userId) as any });
    if (!updatedUserDoc) {
      return { success: false, message: 'Failed to retrieve user after update.', error: 'Could not fetch updated user.' };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...userWithoutPassword } = updatedUserDoc;

    return {
      success: true,
      message: 'User updated successfully!',
      user: {
        ...userWithoutPassword,
        _id: updatedUserDoc._id.toString(),
        schoolId: updatedUserDoc.schoolId?.toString(),
        classId: updatedUserDoc.classId || undefined, 
        classIds: updatedUserDoc.classIds || undefined,
        admissionId: updatedUserDoc.admissionId || undefined,
        busRouteLocation: updatedUserDoc.busRouteLocation || undefined,
        busClassCategory: updatedUserDoc.busClassCategory || undefined,
        fatherName: updatedUserDoc.fatherName,
        motherName: updatedUserDoc.motherName,
        dob: updatedUserDoc.dob,
        section: updatedUserDoc.section,
        rollNo: updatedUserDoc.rollNo,
        
        symbolNo: updatedUserDoc.symbolNo,
        registrationNo: updatedUserDoc.registrationNo,
        district: updatedUserDoc.district,
        gender: updatedUserDoc.gender,
        quota: updatedUserDoc.quota,
        createdAt: updatedUserDoc.createdAt ? new Date(updatedUserDoc.createdAt).toISOString() : undefined,
        updatedAt: updatedUserDoc.updatedAt ? new Date(updatedUserDoc.updatedAt).toISOString() : undefined,
      }
    };

  } catch (error) {
    console.error('Update school user server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during user update.', error: errorMessage };
  }
}

export interface DeleteSchoolUserResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function deleteSchoolUser(userId: string, schoolId: string): Promise<DeleteSchoolUserResult> {
  try {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid User or School ID format.', error: 'Invalid ID.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const result = await usersCollection.deleteOne({
      _id: new ObjectId(userId) as any,
      schoolId: new ObjectId(schoolId) as any,
      role: { $in: ['teacher', 'student', 'attendancetaker'] }
    });

    if (result.deletedCount === 0) {
      return { success: false, message: 'User not found or already deleted.', error: 'User not found.' };
    }

    revalidatePath('/dashboard/admin/users');
    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/teachers');
    revalidatePath('/dashboard/admin/attendancetaker');

    return { success: true, message: 'User deleted successfully!' };

  } catch (error) {
    console.error('Delete school user server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during user deletion.', error: errorMessage };
  }
}

export interface DeleteBulkSchoolUsersResult {
  success: boolean;
  message: string;
  deletedCount: number;
  error?: string;
}

export async function deleteBulkSchoolUsers(userIds: string[], schoolId: string): Promise<DeleteBulkSchoolUsersResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid School ID format.', deletedCount: 0, error: 'Invalid ID.' };
    }
    const validUserIds = userIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    if (validUserIds.length !== userIds.length) {
      return { success: false, message: 'Some User IDs provided were invalid.', deletedCount: 0, error: 'Invalid User ID format.' };
    }
    if (validUserIds.length === 0) {
      return { success: true, message: 'No users selected for deletion.', deletedCount: 0 };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const result = await usersCollection.deleteMany({
      _id: { $in: validUserIds as any[] },
      schoolId: new ObjectId(schoolId) as any,
      role: 'student'
    });

    if (result.deletedCount === 0) {
      return { success: false, message: 'No matching students found or they were already deleted.', deletedCount: 0, error: 'Users not found.' };
    }

    revalidatePath('/dashboard/admin/students');
    revalidatePath('/dashboard/admin/users');

    return { success: true, message: `${result.deletedCount} student(s) deleted successfully!`, deletedCount: result.deletedCount };

  } catch (error) {
    console.error('Bulk delete school users server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: 'An unexpected error occurred during bulk deletion.', deletedCount: 0, error: errorMessage };
  }
}

export async function getStudentsByClass(schoolId: string, classId: string): Promise<GetSchoolUsersResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid School or Class ID format.', error: 'Invalid ID format.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const studentsFromDb = await usersCollection.find({
      schoolId: new ObjectId(schoolId) as any,
      classId: classId, // classId is now the _id (string)
      role: 'student'
    }).project({ password: 0 }).sort({ name: 1 }).toArray();

    const users = studentsFromDb.map(studentDoc => {
      const student = studentDoc as unknown as User;
      return {
        _id: student._id.toString(),
        name: student.name,
        email: student.email,
        role: student.role,
        schoolId: student.schoolId?.toString(),
        classId: student.classId || undefined,
        admissionId: student.admissionId || undefined,
        busRouteLocation: student.busRouteLocation || undefined,
        busClassCategory: student.busClassCategory || undefined,
        fatherName: student.fatherName,
        motherName: student.motherName,
        dob: student.dob,
        section: student.section,
        rollNo: student.rollNo,
        
        symbolNo: student.symbolNo,
        registrationNo: student.registrationNo,
        district: student.district,
        gender: student.gender,
        quota: student.quota,
        createdAt: student.createdAt ? new Date(student.createdAt).toISOString() : undefined,
        updatedAt: student.updatedAt ? new Date(student.updatedAt).toISOString() : undefined,
      };
    });

    return { success: true, users: users };
  } catch (error) {
    console.error('Get students by class server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch students for the class.' };
  }
}

export interface SchoolUserRoleCounts {
  students: number;
  teachers: number;
  attendanceTakers: number;
}
export interface GetSchoolUserRoleCountsResult {
  success: boolean;
  counts?: SchoolUserRoleCounts;
  error?: string;
  message?: string;
}

export async function getSchoolUserRoleCounts(schoolId: string): Promise<GetSchoolUserRoleCountsResult> {
  try {
    if (!ObjectId.isValid(schoolId)) {
      return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.' };
    }
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const studentCount = await usersCollection.countDocuments({ schoolId: new ObjectId(schoolId) as any, role: 'student' });
    const teacherCount = await usersCollection.countDocuments({ schoolId: new ObjectId(schoolId) as any, role: 'teacher' });
    const attendanceTakerCount = await usersCollection.countDocuments({ schoolId: new ObjectId(schoolId) as any, role: 'attendancetaker' });

    return { success: true, counts: { students: studentCount, teachers: teacherCount, attendanceTakers: attendanceTakerCount } };
  } catch (error) {
    console.error('Get school user role counts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch user role counts.' };
  }
}

export interface GetStudentCountByClassResult {
  success: boolean;
  count?: number;
  error?: string;
  message?: string;
}

export async function getStudentCountByClass(schoolId: string, classId: string): Promise<GetStudentCountByClassResult> {
  try {
    if (!ObjectId.isValid(schoolId) || !ObjectId.isValid(classId)) {
      return { success: false, message: 'Invalid School or Class ID format.', error: 'Invalid ID.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const count = await usersCollection.countDocuments({
      schoolId: new ObjectId(schoolId) as any,
      classId: classId, // classId is the _id (string)
      role: 'student'
    });

    return { success: true, count };
  } catch (error) {
    console.error('Get student count by class server action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch student count for the class.' };
  }
}

export interface StudentDetailsForReportCard {
    _id: string; 
    name: string;
    admissionId?: string;
    classId?: string; 
    schoolId?: string; 
    // New fields
    fatherName?: string;
    motherName?: string;
    dob?: string;
    section?: string;
    rollNo?: string;
    aadharNo?: string;
    
    udiseCodeSchoolName?: string; // Placeholder for school name
    symbolNo?: string;
    registrationNo?: string;
    district?: string;
    gender?: string;
    quota?: string;
}
export interface GetStudentDetailsForReportCardResult {
  success: boolean;
  student?: StudentDetailsForReportCard;
  error?: string;
  message?: string;
}

export async function getStudentDetailsForReportCard(registrationNoQuery: string, schoolIdQuery: string): Promise<GetStudentDetailsForReportCardResult> {
  try {
    if (!registrationNoQuery || registrationNoQuery.trim() === "") {
      return { success: false, message: 'Registration Number cannot be empty.', error: 'Invalid Registration Number.' };
    }
    if (!ObjectId.isValid(schoolIdQuery)) {
      return { success: false, message: 'Invalid School ID format.', error: 'Invalid School ID.' };
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const studentDoc = await usersCollection.findOne({ 
        registrationNo: registrationNoQuery, 
        schoolId: new ObjectId(schoolIdQuery) as any,
        role: 'student' 
    });

    if (!studentDoc) {
      return { success: false, message: `Student with Registration No '${registrationNoQuery}' not found in this school.`, error: 'Student not found.' };
    }
    
    const student = studentDoc as User; // Type assertion

    const studentDetails: StudentDetailsForReportCard = {
      _id: student._id.toString(), 
      name: student.name,
      admissionId: student.admissionId,
      classId: student.classId, 
      schoolId: student.schoolId?.toString(),
      fatherName: student.fatherName,
      motherName: student.motherName,
      dob: student.dob,
      section: student.section,
      rollNo: student.rollNo,
      aadharNo: student.aadharNo,
      
      symbolNo: student.symbolNo,
      registrationNo: student.registrationNo,
      district: student.district,
      gender: student.gender,
      quota: student.quota,
    };

    return { success: true, student: studentDetails };
  } catch (error) {
    console.error('Get student details for report card by registration number error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage, message: 'Failed to fetch student details for report card.' };
  }
}
