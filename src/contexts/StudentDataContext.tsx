
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '@/types/user';
import type { AttendanceRecord } from '@/types/attendance';
import type { FeePayment } from '@/types/fees';
import type { School, TermFee } from '@/types/school';
import type { FeeConcession } from '@/types/concessions'; // Import FeeConcession
import { getStudentAttendanceRecords } from '@/app/actions/attendance';
import { getFeePaymentsByStudent } from '@/app/actions/fees';
import { getSchoolById } from '@/app/actions/schools';
import { getFeeConcessionsForStudent } from '@/app/actions/concessions'; // Import action
import { useToast } from '@/hooks/use-toast';

// Helper to determine current academic year string (e.g., "2023-2024")
const getCurrentAcademicYear = (): string => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0 (Jan) to 11 (Dec)
  const currentYear = today.getFullYear();
  // Assuming academic year starts in June
  if (currentMonth >= 5) { // June or later
    return `${currentYear}-${currentYear + 1}`;
  } else { // Before June
    return `${currentYear - 1}-${currentYear}`;
  }
};


interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  percentage: number;
  total: number;
}

interface FeeSummary {
  totalFee: number;
  totalPaid: number;
  totalConcessions: number; // Added
  totalDue: number;
  percentagePaid: number;
}

interface StudentDataContextType {
  authUser: AuthUser | null;
  attendanceSummary: AttendanceSummary;
  feeSummary: FeeSummary | null;
  appliedConcessions: FeeConcession[]; // Added to store individual concessions
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  schoolDetails: School | null;
}

const StudentDataContext = createContext<StudentDataContextType | undefined>(undefined);

export const useStudentData = (): StudentDataContextType => {
  const context = useContext(StudentDataContext);
  if (!context) {
    throw new Error('useStudentData must be used within a StudentDataProvider');
  }
  return context;
};

interface StudentDataProviderProps {
  children: ReactNode;
}

export const StudentDataProvider = ({ children }: StudentDataProviderProps) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    present: 0, absent: 0, late: 0, percentage: 0, total: 0
  });
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [appliedConcessions, setAppliedConcessions] = useState<FeeConcession[]>([]); // State for concessions
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'student' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          setError("Invalid user session for student data.");
        }
      } catch (e) {
        setAuthUser(null);
        setError("Failed to parse user session.");
        console.error("StudentDataProvider: Failed to parse user from localStorage:", e);
      }
    } else {
      setAuthUser(null);
      setError("No user session found.");
    }
  }, []);

  const calculateAnnualTuitionFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig || !schoolConfig.tuitionFees) return 0;
    const classFeeConfig = schoolConfig.tuitionFees.find(cf => cf.className === className);
    if (!classFeeConfig || !classFeeConfig.terms) return 0;
    return classFeeConfig.terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);

  const fetchAllStudentData = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoading(false);
      setError(authUser ? "Missing student ID or School ID." : "User not authenticated for student data.");
      setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      setFeeSummary(null);
      setAppliedConcessions([]);
      setSchoolDetails(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const currentAcademicYearStr = getCurrentAcademicYear();

    try {
      const [attendanceResult, feePaymentsResult, schoolResult, concessionsResult] = await Promise.all([
        getStudentAttendanceRecords(authUser._id.toString(), authUser.schoolId.toString()),
        getFeePaymentsByStudent(authUser._id.toString(), authUser.schoolId.toString()),
        getSchoolById(authUser.schoolId.toString()),
        getFeeConcessionsForStudent(authUser._id.toString(), authUser.schoolId.toString(), currentAcademicYearStr)
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "School Info Error", description: schoolResult.message || "Could not load school details." });
        setSchoolDetails(null);
      }
      
      if (attendanceResult.success && attendanceResult.records) {
        const records = attendanceResult.records;
        const totalDays = records.length;
        if (totalDays > 0) {
          const present = records.filter(r => r.status === 'present').length;
          const absent = records.filter(r => r.status === 'absent').length;
          const late = records.filter(r => r.status === 'late').length;
          const attendedDays = present + late;
          const percentage = Math.round((attendedDays / totalDays) * 100);
          setAttendanceSummary({ present, absent, late, percentage, total: totalDays });
        } else {
          setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
        }
      } else {
        toast({ variant: "warning", title: "Attendance Info", description: attendanceResult.message || "Could not fetch attendance data." });
        setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      }

      if (concessionsResult.success && concessionsResult.concessions) {
        setAppliedConcessions(concessionsResult.concessions);
      } else {
        toast({ variant: "info", title: "Concessions", description: concessionsResult.message || "No concessions found or could not load them." });
        setAppliedConcessions([]);
      }

      if (schoolResult.success && schoolResult.school) {
        const currentSchoolDetails = schoolResult.school;
        const studentPayments = feePaymentsResult.success && feePaymentsResult.payments ? feePaymentsResult.payments : [];
        const studentConcessions = concessionsResult.success && concessionsResult.concessions ? concessionsResult.concessions : [];
        
        if (authUser.classId) {
            const totalAnnualTuitionFee = calculateAnnualTuitionFee(authUser.classId as string, currentSchoolDetails);
            const totalPaid = studentPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
            const totalConcessionsAmount = studentConcessions.reduce((sum, concession) => sum + concession.amount, 0);
            const totalDue = totalAnnualTuitionFee - totalPaid - totalConcessionsAmount;
            
            const netPayable = totalAnnualTuitionFee - totalConcessionsAmount;
            let percentagePaid = 0;
            if (netPayable > 0) {
              percentagePaid = Math.round((totalPaid / netPayable) * 100);
            } else if (netPayable <= 0 && totalPaid > 0) {
              percentagePaid = 100; // Fully paid or overpaid if net payable is zero/negative but something was paid
            } else if (netPayable <= 0 && totalPaid <= 0) {
              percentagePaid = 0; // Or 100 if fee is 0 and no payment, depends on interpretation
            }
            // Ensure percentage doesn't exceed 100 for display if overpaid relative to net
            percentagePaid = Math.min(percentagePaid, 100);


            setFeeSummary({ totalFee: totalAnnualTuitionFee, totalPaid, totalConcessions: totalConcessionsAmount, totalDue, percentagePaid });
        } else {
            setFeeSummary({ totalFee: 0, totalPaid: 0, totalConcessions: 0, totalDue: 0, percentagePaid: 0 });
            toast({ variant: "info", title: "Fee Info", description: "You are not assigned to a class, so fee details cannot be calculated." });
        }
      } else {
        setFeeSummary(null);
      }

    } catch (fetchError) {
      console.error("StudentDataProvider: Error fetching dashboard data:", fetchError);
      setError("An unexpected error occurred fetching dashboard data.");
      toast({ variant: "destructive", title: "Dashboard Error", description: "Could not load your information." });
      setAttendanceSummary({ present: 0, absent: 0, late: 0, percentage: 0, total: 0 });
      setFeeSummary(null);
      setAppliedConcessions([]);
      setSchoolDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, toast, calculateAnnualTuitionFee]);
  
  useEffect(() => {
    if (authUser?._id && authUser?.schoolId) {
      fetchAllStudentData();
    } else if (!authUser && localStorage.getItem('loggedInUser') === null) { 
      setIsLoading(false);
    }
  }, [authUser, fetchAllStudentData]);

  const refreshData = useCallback(() => {
    if (authUser?._id && authUser?.schoolId) {
      fetchAllStudentData();
    }
  }, [authUser, fetchAllStudentData]);

  return (
    <StudentDataContext.Provider value={{ 
        authUser, 
        attendanceSummary, 
        feeSummary, 
        appliedConcessions, // Provide concessions
        isLoading, 
        error, 
        refreshData,
        schoolDetails
    }}>
      {children}
    </StudentDataContext.Provider>
  );
};
