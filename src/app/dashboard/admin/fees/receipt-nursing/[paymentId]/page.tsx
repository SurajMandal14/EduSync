
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getPaymentById } from '@/app/actions/fees';
import { getSchoolById } from '@/app/actions/schools'; 
import { getStudentDetailsForReportCard } from '@/app/actions/schoolUsers';
import { getFeePaymentsByStudent } from '@/app/actions/fees';
import { getFeeConcessionsForSchool } from '@/app/actions/concessions';
import type { FeePayment } from '@/types/fees';
import type { School } from '@/types/school';
import type { User } from '@/types/user';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Printer, AlertTriangle } from "lucide-react";
import NursingCollege, { type NursingStudentInfo, type NursingFeeSummary } from '@/components/report-cards/NursingCollege';

const getCurrentAcademicYear = (): string => {
  const today = new Date();
  const currentMonth = today.getMonth(); 
  const currentYear = today.getFullYear();
  if (currentMonth >= 5) { 
    return `${currentYear}-${currentYear + 1}`;
  } else { 
    return `${currentYear - 1}-${currentYear}`;
  }
};


export default function NursingFeeReceiptPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;
  
  const [payment, setPayment] = useState<FeePayment | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [student, setStudent] = useState<Partial<User> | null>(null);
  const [feeSummary, setFeeSummary] = useState<NursingFeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateAnnualTuitionFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig || !schoolConfig.tuitionFees) return 0;
    const classFeeConfig = schoolConfig.tuitionFees.find(cf => cf.className === className);
    if (!classFeeConfig || !classFeeConfig.terms) return 0;
    return classFeeConfig.terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);

  const calculateAnnualBusFee = useCallback((student: Partial<User> | null, schoolConfig: School | null): number => {
    if (!student || !student.busRouteLocation || !student.busClassCategory || !schoolConfig || !schoolConfig.busFeeStructures) return 0;
    const feeConfig = schoolConfig.busFeeStructures.find(bfs => bfs.location === student.busRouteLocation && bfs.classCategory === student.busClassCategory);
    if (!feeConfig || !feeConfig.terms) return 0;
    return feeConfig.terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);

  const fetchReceiptData = useCallback(async () => {
    if (!paymentId) {
      setError("Payment ID is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const paymentResult = await getPaymentById(paymentId);
      if (!paymentResult.success || !paymentResult.payment) {
          setError(paymentResult.message || "Could not load payment details.");
          setPayment(null);
          setIsLoading(false);
          return;
      }

      const currentPayment = paymentResult.payment;
      setPayment(currentPayment);
      
      const [schoolResult, studentResult, allPaymentsResult, concessionsResult] = await Promise.all([
          getSchoolById(currentPayment.schoolId.toString()),
          // Use getStudentDetailsForReportCard to fetch full student details
          getStudentDetailsForReportCard(currentPayment.studentId.toString(), currentPayment.schoolId.toString()),
          getFeePaymentsByStudent(currentPayment.studentId.toString(), currentPayment.schoolId.toString()),
          getFeeConcessionsForSchool(currentPayment.studentId.toString(), currentPayment.schoolId.toString(), getCurrentAcademicYear())
      ]);

      if (!schoolResult.success || !schoolResult.school) {
        setError(schoolResult.message || "Could not load school details.");
        setIsLoading(false); return;
      }
      const currentSchool = schoolResult.school;
      setSchool(currentSchool);

      if (!studentResult.success || !studentResult.student) {
        setError(studentResult.message || "Could not load student details.");
        setIsLoading(false); return;
      }
      const currentStudent = studentResult.student;
      setStudent(currentStudent);
      
      const totalAnnualTuition = calculateAnnualTuitionFee(currentStudent.classId, currentSchool);
      const totalAnnualBusFee = calculateAnnualBusFee(currentStudent, currentSchool);
      const totalPaid = (allPaymentsResult.payments || []).reduce((sum, p) => sum + p.amountPaid, 0);
      const totalConcessions = (concessionsResult.concessions || []).reduce((sum, c) => sum + c.amount, 0);

      setFeeSummary({
        totalAnnualTuition,
        totalAnnualBusFee,
        totalConcessions,
        totalPaid,
        amountOfThisPayment: currentPayment.amountPaid,
      });

    } catch (e) {
      console.error("Fetch receipt data error:", e);
      setError("An unexpected error occurred while fetching receipt data.");
    } finally {
      setIsLoading(false);
    }
  }, [paymentId, calculateAnnualTuitionFee, calculateAnnualBusFee]);

  useEffect(() => {
    fetchReceiptData();
  }, [fetchReceiptData]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Receipt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive mb-2">Error Loading Receipt</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => typeof window !== "undefined" && window.close()}>Close</Button>
      </div>
    );
  }

  if (!payment || !school || !student || !feeSummary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Receipt Data Not Found</h1>
        <p className="text-muted-foreground mb-6">The requested payment or school details could not be found.</p>
        <Button onClick={() => typeof window !== "undefined" && window.close()}>Close</Button>
      </div>
    );
  }
  
  const studentInfoForTemplate: NursingStudentInfo = {
    schoolName: school.schoolName,
    schoolAddress: (school as any).address || 'Mirchaiya-7, Siraha', 
    studentName: student.name,
    symbolNo: student.symbolNo,
    course: student.classId, 
    quota: student.quota,
    address: student.district, 
    photoUrl: (student as any).avatarUrl,
  };

  return (
    <div className="min-h-screen bg-muted p-4 sm:p-8 flex flex-col items-center print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .printable-receipt-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
      <Card className="w-full max-w-2xl shadow-xl printable-receipt-container print:shadow-none print:border-none">
        <CardContent className="p-0">
          <NursingCollege studentInfo={studentInfoForTemplate} feeSummary={feeSummary} />
        </CardContent>
      </Card>
      <div className="mt-8 flex gap-4 no-print w-full max-w-2xl">
        <Button onClick={handlePrint} className="w-full sm:w-auto flex-1">
          <Printer className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
        <Button variant="outline" onClick={() => typeof window !== "undefined" && window.close()} className="w-full sm:w-auto flex-1">
          Close
        </Button>
      </div>
    </div>
  );
}
