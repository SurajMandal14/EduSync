
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Printer, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser, UserRole } from '@/types/user';
import { getStudentReportCard } from '@/app/actions/reports';
import type { ReportCardData } from '@/types/report';
import CBSEStateFront, { type SubjectFAData as FrontSubjectFAData } from '@/components/report-cards/CBSEStateFront';
import CBSEStateBack from '@/components/report-cards/CBSEStateBack';
import NursingCollegeReportCard, { type NursingStudentInfo, type NursingMarksInfo } from '@/components/report-cards/NursingCollegeReportCard';
import { getSchoolById } from '@/app/actions/schools';
import type { School } from '@/types/school';

function StudentResultsPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [reportCardData, setReportCardData] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBackSide, setShowBackSide] = useState(false);

  const fetchReportData = useCallback(async (user: AuthUser) => {
    if (!user._id || !user.schoolId) {
      setError("Cannot fetch report without student details.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportCardData(null);
    setSchoolDetails(null);

    try {
      // Pass the school's configured template key to the backend
      const schoolResult = await getSchoolById(user.schoolId);
      if (!schoolResult.success || !schoolResult.school) {
        setError(schoolResult.message || "Could not load your school's configuration.");
        setIsLoading(false);
        return;
      }
      setSchoolDetails(schoolResult.school);
      
      const result = await getStudentReportCard(user._id, user.schoolId);
      
      if (result.success && result.reportCard) {
        setReportCardData(result.reportCard);
      } else {
        setError(result.message || `Failed to load your report card.`);
        setReportCardData(null);
      }
    } catch (e) {
      console.error("Fetch report error:", e);
      setError("An unexpected error occurred while fetching the report card.");
      setReportCardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'student' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
          fetchReportData(parsedUser);
        } else {
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
  }, [fetchReportData]);

  const handlePrint = () => window.print();

  const renderReportCard = () => {
    if (!reportCardData || !schoolDetails) return null;

    const templateKey = reportCardData.reportCardTemplateKey;

    if (templateKey === 'nursing_college') {
      const studentInfoForNursing: NursingStudentInfo = {
        regdNo: (schoolDetails as any)?.regdNo || "70044/066/067", 
        email: (schoolDetails as any)?.email || "mirchaiyanursingcampussiraha@gmail.com",
        schoolName: schoolDetails?.schoolName,
        address_school: (schoolDetails as any)?.address || "Mirchaiya-07, Siraha",
        examTitle: reportCardData.studentInfo?.examTitle || `${reportCardData.term} Examination`,
        session: reportCardData.studentInfo?.session || reportCardData.term, // Fallback to term
        symbolNo: reportCardData.studentInfo.symbolNo,
        studentName: reportCardData.studentInfo.studentName,
        fatherName: reportCardData.studentInfo.fatherName,
        program: reportCardData.studentInfo.class,
        year: "Third", // This might need to be dynamic in the future
      };

      const marksForNursing: NursingMarksInfo[] = (reportCardData.summativeAssessments || []).map((mark, index) => {
        const marksObtained = mark.sa1.marks ?? 0;
        const maxMarks = mark.sa1.maxMarks ?? 80;
        const passMarks = maxMarks * 0.4;
        return {
          sn: index + 1,
          subject: mark.subjectName,
          fullMarks: maxMarks,
          passMarks: passMarks,
          theoryMarks: marksObtained,
          practicalMarks: 0,
          totalMarks: marksObtained,
          remarks: marksObtained >= passMarks ? "Pass" : "Fail",
        };
      }).filter((mark, index, self) => index === self.findIndex((t) => t.subject === mark.subject));

      return (
        <div className="printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md">
          <NursingCollegeReportCard studentInfo={studentInfoForNursing} marks={marksForNursing} />
        </div>
      );
    }

    if (templateKey === 'cbse_state') {
      const frontProps = {
        studentData: reportCardData.studentInfo,
        academicSubjects: (reportCardData.formativeAssessments || []).map(fa => ({ name: fa.subjectName, teacherId: undefined, teacherName: undefined })),
        faMarks: (reportCardData.formativeAssessments || []).reduce((acc, curr) => {
          acc[curr.subjectName] = { fa1: curr.fa1, fa2: curr.fa2, fa3: curr.fa3, fa4: curr.fa4 };
          return acc;
        }, {} as Record<string, FrontSubjectFAData>),
        coMarks: reportCardData.coCurricularAssessments,
        secondLanguage: reportCardData.secondLanguage || 'Hindi',
        academicYear: reportCardData.term || "",
        onStudentDataChange: () => {}, onFaMarksChange: () => {}, onCoMarksChange: () => {}, onSecondLanguageChange: () => {}, onAcademicYearChange: () => {},
        currentUserRole: "student" as UserRole, editableSubjects: [],
      };
      const backProps = {
        saData: reportCardData.summativeAssessments,
        attendanceData: reportCardData.attendance,
        finalOverallGradeInput: reportCardData.finalOverallGrade,
        secondLanguageSubjectName: reportCardData.secondLanguage,
        onSaDataChange: () => {}, onFaTotalChange: () => {}, onAttendanceDataChange: () => {}, onFinalOverallGradeInputChange: () => {},
        currentUserRole: "student" as UserRole, editableSubjects: [],
      };
      return (
        <>
          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${showBackSide ? 'hidden' : ''}`}>
            <CBSEStateFront {...frontProps} />
          </div>
          {showBackSide && <div className="page-break no-print"></div>}
          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${!showBackSide ? 'hidden' : ''}`}>
            <CBSEStateBack {...backProps} />
          </div>
        </>
      );
    }

    // Fallback if template key is unknown or data is malformed
    return (
      <Card className="no-print border-destructive">
        <CardHeader><CardTitle>Cannot Display Report</CardTitle></CardHeader>
        <CardContent>
          <p>The report card format ({templateKey || 'unknown'}) is not recognized or data is incomplete.</p>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
       <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-report-card, .printable-report-card * { visibility: visible !important; }
          .printable-report-card { 
            position: absolute !important; left: 0 !important; top: 0 !important; 
            width: 100% !important; margin: 0 !important; padding: 0 !important; 
            transform: scale(0.95); transform-origin: top left;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Award className="mr-2 h-6 w-6" /> My Exam Results
          </CardTitle>
          <CardDescription>View your latest published academic report card.</CardDescription>
        </CardHeader>
        
        {!isLoading && reportCardData && (
          <CardContent className="flex justify-end gap-2">
              {reportCardData.reportCardTemplateKey === 'cbse_state' && (
                <Button onClick={() => setShowBackSide(prev => !prev)} variant="outline">
                    {showBackSide ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                    {showBackSide ? "View Front" : "View Back"}
                </Button>
              )}
            <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Report Card</Button>
          </CardContent>
        )}
      </Card>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading your latest report card...</p>
        </div>
      ) : error ? (
         <Card className="no-print border-destructive">
            <CardHeader className="flex-row items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive"/><CardTitle className="text-destructive">Report Not Available</CardTitle>
            </CardHeader>
            <CardContent><p>{error}</p></CardContent>
         </Card>
      ) : reportCardData ? (
        renderReportCard()
      ) : (
         <Card className="no-print">
            <CardContent className="py-10 text-center text-muted-foreground">
                <p>No published report card found for your account at this time.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StudentResultsPage;
