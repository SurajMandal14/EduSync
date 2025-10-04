
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Printer, RotateCcw, Loader2, Info, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser, UserRole } from '@/types/user';
import { getStudentReportCard } from '@/app/actions/reports';
import type { ReportCardData } from '@/types/report';
import CBSEStateFront, { 
    type SubjectFAData as FrontSubjectFAData, 
} from '@/components/report-cards/CBSEStateFront';
import CBSEStateBack from '@/components/report-cards/CBSEStateBack';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { getAvailableTermsForStudent } from '@/app/actions/marks';

export default function StudentResultsPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [reportCardData, setReportCardData] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("");

  const [showBackSide, setShowBackSide] = useState(false);

  // Effect to get the authenticated user first
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'student' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          setError("Access Denied. You must be a student to view results.");
          setIsLoading(false);
        }
      } catch (e) {
        setError("Session Error. Failed to load user data.");
        setIsLoading(false);
        console.error("StudentResultsPage: Failed to parse user from localStorage:", e);
      }
    } else {
      setError("No active session. Please log in.");
      setIsLoading(false);
    }
  }, []);

  // Effect to fetch available terms once the user is authenticated
  useEffect(() => {
    if (!authUser) return;

    async function fetchAvailableYears() {
      setIsLoading(true);
      const res = await getAvailableTermsForStudent(authUser._id!, authUser.schoolId!);
      if (res.success && res.data && res.data.length > 0) {
        setAvailableTerms(res.data);
        setSelectedTerm(res.data[0]); // Auto-select the first available term
      } else {
        setError("No academic history found. Cannot display report cards.");
        setIsLoading(false);
      }
    }
    
    fetchAvailableYears();
  }, [authUser]);

  // Effect to fetch the report card when user or selections change
  const fetchReport = useCallback(async () => {
    if (!authUser || !selectedTerm) {
      setReportCardData(null);
      if (authUser && availableTerms.length > 0 && !selectedTerm) {
        setError("Please select a term to view the report.");
      }
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setReportCardData(null);

    try {
      const result = await getStudentReportCard(authUser._id, authUser.schoolId!, true); 
      if (result.success && result.reportCard) {
        // Filter the report card based on the selected term from client side
        if (result.reportCard.term === selectedTerm) {
          setReportCardData(result.reportCard);
        } else {
          const newResult = await getStudentReportCard(authUser._id, authUser.schoolId!, true);
          if (newResult.success && newResult.reportCard && newResult.reportCard.term === selectedTerm) {
             setReportCardData(newResult.reportCard);
          } else {
            setReportCardData(null);
            setError(newResult.message || "Failed to load report card for the selected term.");
          }
        }
      } else {
        setReportCardData(null);
        setError(result.message || "Failed to load report card for the selected term.");
      }
    } catch (e) {
      console.error("Fetch report error:", e);
      setError("An unexpected error occurred while fetching the report card.");
      setReportCardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [authUser, selectedTerm, availableTerms]);

  useEffect(() => {
    if(authUser && selectedTerm) {
      fetchReport();
    }
  }, [authUser, selectedTerm, fetchReport]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const frontProps = reportCardData ? {
    studentData: reportCardData.studentInfo,
    academicSubjects: (reportCardData.formativeAssessments || []).map(fa => ({ name: fa.subjectName, teacherId: undefined, teacherName: undefined })),
    faMarks: (reportCardData.formativeAssessments || []).reduce((acc, curr) => {
      acc[curr.subjectName] = { fa1: curr.fa1, fa2: curr.fa2, fa3: curr.fa3, fa4: curr.fa4 };
      return acc;
    }, {} as Record<string, FrontSubjectFAData>),
    coMarks: reportCardData.coCurricularAssessments,
    secondLanguage: reportCardData.secondLanguage || 'Hindi', 
    academicYear: "", 
    onStudentDataChange: () => {},
    onFaMarksChange: () => {},
    onCoMarksChange: () => {},
    onSecondLanguageChange: () => {},
    onAcademicYearChange: () => {},
    currentUserRole: "student" as UserRole,
    editableSubjects: [],
  } : null;

  const backProps = reportCardData ? {
    saData: reportCardData.summativeAssessments,
    attendanceData: reportCardData.attendance,
    finalOverallGradeInput: reportCardData.finalOverallGrade,
    secondLanguageSubjectName: reportCardData.secondLanguage,
    onSaDataChange: () => {},
    onFaTotalChange: () => {},
    onAttendanceDataChange: () => {},
    onFinalOverallGradeInputChange: () => {},
    currentUserRole: "student" as UserRole,
    editableSubjects: [],
  } : null;

  return (
    <div className="space-y-6">
       <style jsx global>{\`
        @media print {
          body * { visibility: hidden; }
          .printable-report-card, .printable-report-card * { visibility: visible !important; }
          .printable-report-card { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            transform: scale(0.95); 
            transform-origin: top left;
          }
          .no-print { display: none !important; }
           .page-break { page-break-after: always; }
        }
      \`}
      </style>
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Award className="mr-2 h-6 w-6" /> My Exam Results
          </CardTitle>
          <CardDescription>
            View your academic performance and report card.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
             <div className="w-full sm:w-auto">
                <Label htmlFor="termSelect">Select Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={isLoading || availableTerms.length === 0}>
                    <SelectTrigger id="termSelect" className="max-w-xs"><SelectValue placeholder={availableTerms.length === 0 ? "No terms found" : "Select Term"} /></SelectTrigger>
                    <SelectContent>{availableTerms.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <Button onClick={fetchReport} disabled={isLoading || !selectedTerm}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
                Fetch Report
            </Button>
        </CardContent>
      </Card>
      
      {isLoading && (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading report card...</p>
        </div>
      )}

      {!isLoading && error && (
         <Card className="no-print border-destructive">
            <CardHeader className="flex-row items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive"/>
                <CardTitle className="text-destructive">Report Not Available</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
            </CardContent>
         </Card>
      )}

      {!isLoading && !error && !reportCardData && (
        <Card className="no-print">
          <CardContent className="p-10 text-center">
            <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No Report Card Found</p>
            <p className="text-muted-foreground">
              Your report card for the selected term is not yet published or does not exist.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && reportCardData && frontProps && backProps && (
        <>
          <div className="flex justify-end gap-2 no-print mb-4">
             <Button onClick={() => setShowBackSide(prev => !prev)} variant="outline">
                {showBackSide ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {showBackSide ? "View Front" : "View Back"}
            </Button>
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Report Card</Button>
          </div>
          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${showBackSide ? 'hidden' : ''}`}>
            <CBSEStateFront {...frontProps} />
          </div>
          
          {showBackSide && <div className="page-break no-print"></div>}

          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${!showBackSide ? 'hidden' : ''}`}>
            <CBSEStateBack {...backProps} />
          </div>
        </>
      )}
    </div>
  );
}
