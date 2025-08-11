
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getPaymentById } from '@/app/actions/fees';
import { getSchoolById } from '@/app/actions/schools'; 
import { getStudentDetailsForReportCard } from '@/app/actions/schoolUsers';
import type { FeePayment } from '@/types/fees';
import type { School } from '@/types/school';
import type { User } from '@/types/user';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Printer, AlertTriangle } from "lucide-react";
import NursingCollege, { type NursingStudentInfo } from '@/components/report-cards/NursingCollege';

export default function NursingFeeReceiptPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;
  
  const [payment, setPayment] = useState<FeePayment | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [student, setStudent] = useState<Partial<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (paymentResult.success && paymentResult.payment) {
        const currentPayment = paymentResult.payment;
        setPayment(currentPayment);
        
        const [schoolResult, studentResult] = await Promise.all([
            getSchoolById(currentPayment.schoolId.toString()),
            getStudentDetailsForReportCard(currentPayment.studentId.toString(), currentPayment.schoolId.toString())
        ]);

        if (schoolResult.success && schoolResult.school) {
          setSchool(schoolResult.school);
        } else {
          setError(schoolResult.message || "Could not load school details.");
        }
        
        if (studentResult.success && studentResult.student) {
            setStudent(studentResult.student);
        } else {
            // Fallback to name from payment if direct student fetch fails
            setStudent({ name: currentPayment.studentName, classId: currentPayment.classId });
        }

      } else {
        setError(paymentResult.message || "Could not load payment details.");
        setPayment(null);
      }
    } catch (e) {
      console.error("Fetch receipt data error:", e);
      setError("An unexpected error occurred while fetching receipt data.");
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

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

  if (!payment || !school || !student) {
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
    schoolAddress: (school as any).address || 'Mirchaiya-7, Siraha', // Placeholder
    studentName: student.name,
    symbolNo: student.symbolNo,
    course: student.classId,
    // Add other fields from your student/school type as needed
  };
  
  // NOTE: This receipt shows dummy fee breakdown as we don't store line items per payment.
  const dummyMarks = [
      { subject: 'Admission Fee', totalMarks: 0, passingMarks: 0, obtainMarks: 0 },
      { subject: 'Refundable Fee', totalMarks: 0, passingMarks: 0, obtainMarks: payment.amountPaid },
      { subject: 'Registration Fee', totalMarks: 0, passingMarks: 0, obtainMarks: 0 },
      { subject: 'Transportation Fee', totalMarks: 0, passingMarks: 0, obtainMarks: 60000 },
      { subject: 'Dress Fee', totalMarks: 0, passingMarks: 0, obtainMarks: 15000 },
      { subject: 'Book Fee', totalMarks: 0, passingMarks: 0, obtainMarks: 11000 },
      { subject: 'Hostel Fee', totalMarks: 0, passingMarks: 0, obtainMarks: 156000 },
  ];

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
          <NursingCollege studentInfo={studentInfoForTemplate} marks={dummyMarks} />
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

    