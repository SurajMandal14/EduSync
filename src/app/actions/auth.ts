
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import * as z from 'zod';
import type { User } from '@/types/user'; 
import bcrypt from 'bcryptjs'; 
import { format } from 'date-fns';

const loginSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Admission Number is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export interface LoginResult {
  success: boolean;
  error?: string;
  message?: string;
  user?: Pick<User, 'email' | 'name' | 'role' | '_id' | 'schoolId' | 'classId' | 'admissionId' | 'avatarUrl' | 'registrationNo'> & { requiresPasswordChange?: boolean };
}

export async function loginUser(values: z.infer<typeof loginSchema>): Promise<LoginResult> {
  try {
    const validatedFields = loginSchema.safeParse(values);
    if (!validatedFields.success) {
      const errors = validatedFields.error.errors.map(e => e.message).join(' ');
      return { error: errors || 'Invalid fields!', success: false };
    }

    const { identifier, password } = validatedFields.data;

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');
    let user: User | null = null;
    let isDefaultPassword = false;

    if (identifier.includes('@')) { // Treat as email (for admins, teachers)
      user = await usersCollection.findOne({ email: identifier });
      if (user && user.email !== identifier) {
         return { error: 'User not found or email case mismatch.', success: false };
      }
    } else { // Treat as registration number (only for students)
      user = await usersCollection.findOne({ registrationNo: identifier, role: 'student' });
    }

    if (!user) {
      return { error: 'User not found. Please check your credentials.', success: false };
    }

    if (!user.password) {
      return { error: 'Password not set for this user. Please contact support.', success: false };
    }

    const isHashedPasswordValid = await bcrypt.compare(password, user.password);

    if (!isHashedPasswordValid) {
      // Fallback 1: Plain text password (e.g., initial superadmin)
      if (user.password === password) {
        // Plain text password matches, not a default DOB password
        isDefaultPassword = false; 
      } 
      // Fallback 2: Student DOB password
      else if (user.role === 'student' && user.dob) {
        try {
          const dobPassword = format(new Date(user.dob), 'ddMMyyyy');
          if (password === dobPassword) {
            isDefaultPassword = true;
          } else {
            return { error: 'Invalid password. Please try again.', success: false };
          }
        } catch (e) {
          // Invalid DOB format in DB, so this check fails
          return { error: 'Invalid password. Please try again.', success: false };
        }
      } else {
        return { error: 'Invalid password. Please try again.', success: false };
      }
    }
    
    return {
      success: true,
      message: 'Login successful! Redirecting...',
      user: { 
        _id: user._id.toString(),
        email: user.email, 
        name: user.name, 
        role: user.role,
        schoolId: user.schoolId?.toString(),
        classId: user.classId || undefined,
        admissionId: user.admissionId,
        registrationNo: user.registrationNo,
        avatarUrl: user.avatarUrl,
        requiresPasswordChange: isDefaultPassword,
      }
    };

  } catch (error) {
    console.error('Login server action error:', error);
    return { error: 'An unexpected error occurred during login. Please try again later.', success: false };
  }
}

  
