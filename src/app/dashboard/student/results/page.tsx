
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Printer, RotateCcw, Loader2, Info, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser, UserRole } from '@/types/user';
import { getStudentReportCard } from '@/app/actions/reports';
import type { ReportCardData } from '@/types/report';
import CBSEStateFront, { type SubjectFAData as FrontSubjectFAData } from '@/components/report-cards/CBSEStateFront';
import CBSEStateBack from '@/components/report-cards/CBSEStateBack';
import NursingCollegeReportCard, { type NursingStudentInfo, type NursingMarksInfo } from '@/components/report-cards/NursingCollegeReportCard';
import { getSchoolById } from '@/app/actions/schools';
import type { School } from '@/types/school';
import { getAvailableTermsForStudent } from '@/app/actions/marks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';

function StudentResultsPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [reportCardData, setReportCardData] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [showBackSide, setShowBackSide] = useState(false);

  const fetchAvailableTerms = useCallback(async (user: AuthUser) => {
    if (!user._id || !user.schoolId) return;
    const termsResult = await getAvailableTermsForStudent(user._id, user.schoolId);
    if (termsResult.success && termsResult.data && termsResult.data.length > 0) {
      setAvailableTerms(termsResult.data);
      setSelectedTerm(termsResult.data[0]);
    } else {
      setAvailableTerms([]);
      setSelectedTerm('');
      setError("No academic history found. Cannot display report cards.");
    }
  }, []);

  const fetchReportData = useCallback(async (user: AuthUser, term: string) => {
    if (!user._id || !user.schoolId || !term) {
      setReportCardData(null);
      setError("Cannot fetch report without student details and a selected term.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportCardData(null);
    try {
      const result = await getStudentReportCard(user._id, user.schoolId, term, true);
      if (result.success && result.reportCard) {
        setReportCardData(result.reportCard);
      } else {
        setReportCardData(null);
        setError(result.message || `Failed to load report card for ${term}.`);
      }
    } catch (e) {
      console.error("Fetch report error:", e);
      setError("An unexpected error occurred while fetching the report card.");
      setReportCardData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'student' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
          await fetchAvailableTerms(parsedUser);
          const schoolResult = await getSchoolById(parsedUser.schoolId);
          if (schoolResult.success && schoolResult.school) {
            setSchoolDetails(schoolResult.school);
          } else {
            setError("Could not load school details. Report card cannot be displayed.");
          }
        } else {
          setError("Access Denied. You must be a student to view results.");
        }
      } catch (e) {
        setError("Session Error. Failed to load user data.");
        console.error("StudentResultsPage: Failed to parse user from localStorage:", e);
      }
    } else {
      setError("No active session. Please log in.");
    }
    setIsLoading(false);
  }, [fetchAvailableTerms]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (authUser && selectedTerm) {
      fetchReportData(authUser, selectedTerm);
    } else if (authUser && availableTerms.length === 0) {
      setIsLoading(false);
    }
  }, [authUser, selectedTerm, availableTerms, fetchReportData]);

  const handlePrint = () => window.print();

  const getFrontProps = () => {
    if (!reportCardData || reportCardData.reportCardTemplateKey !== 'cbse_state') return null;
    return {
      studentData: reportCardData.studentInfo,
      academicSubjects: (reportCardData.formativeAssessments || []).map(fa => ({ name: fa.subjectName, teacherId: undefined, teacherName: undefined })),
      faMarks: (reportCardData.formativeAssessments || []).reduce((acc, curr) => {
        acc[curr.subjectName] = { fa1: curr.fa1, fa2: curr.fa2, fa3: curr.fa3, fa4: curr.fa4 };
        return acc;
      }, {} as Record<string, FrontSubjectFAData>),
      coMarks: reportCardData.coCurricularAssessments,
      secondLanguage: reportCardData.secondLanguage || 'Hindi',
      academicYear: reportCardData.studentInfo?.academicYear || "",
      onStudentDataChange: () => {}, onFaMarksChange: () => {}, onCoMarksChange: () => {}, onSecondLanguageChange: () => {}, onAcademicYearChange: () => {},
      currentUserRole: "student" as UserRole, editableSubjects: [],
    };
  };

  const getBackProps = () => {
    if (!reportCardData || reportCardData.reportCardTemplateKey !== 'cbse_state') return null;
    return {
      saData: reportCardData.summativeAssessments,
      attendanceData: reportCardData.attendance,
      finalOverallGradeInput: reportCardData.finalOverallGrade,
      secondLanguageSubjectName: reportCardData.secondLanguage,
      onSaDataChange: () => {}, onFaTotalChange: () => {}, onAttendanceDataChange: () => {}, onFinalOverallGradeInputChange: () => {},
      currentUserRole: "student" as UserRole, editableSubjects: [],
    };
  };
  
  const getNursingProps = () => {
      if (!reportCardData || reportCardData.reportCardTemplateKey !== 'nursing_college' || !reportCardData.studentInfo) return null;

      const studentInfoForNursing: NursingStudentInfo = {
          regdNo: (schoolDetails as any)?.regNo || "70044/066/067",
          email: (schoolDetails as any)?.email || "mirchaiyanursingcampussiraha@gmail.com",
          schoolName: schoolDetails?.schoolName,
          address_school: "Mirchaiya-07, Siraha",
          examTitle: reportCardData.term ? `${reportCardData.term} Examination` : "Final Examination",
          session: reportCardData.studentInfo?.academicYear || reportCardData.term, // Fallback to term
          symbolNo: reportCardData.studentInfo.symbolNo,
          studentName: reportCardData.studentInfo.studentName,
          fatherName: reportCardData.studentInfo.fatherName,
          program: reportCardData.studentInfo.class,
          year: "Third",
      };

      const marksForNursing: NursingMarksInfo[] = (reportCardData.summativeAssessments || []).map((mark, index) => {
          const marksObtained = mark.sa1.marks ?? 0;
          const maxMarks = mark.sa1.maxMarks ?? 80;
          const passMarks = maxMarks * 0.4;

          return {
              sn: index + 1, subject: mark.subjectName, fullMarks: maxMarks, passMarks: passMarks,
              theoryMarks: marksObtained, practicalMarks: 0, totalMarks: marksObtained,
              remarks: marksObtained >= passMarks ? "Pass" : "Fail",
          };
      }).filter((mark, index, self) => index === self.findIndex((t) => t.subject === mark.subject));

      return { studentInfo: studentInfoForNursing, marks: marksForNursing };
  };

  const renderReportCard = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading report card...</p>
        </div>
      );
    }

    if (error) {
      return (
         <Card className="no-print border-destructive">
            <CardHeader className="flex-row items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive"/><CardTitle className="text-destructive">Report Not Available</CardTitle>
            </CardHeader>
            <CardContent><p>{error}</p></CardContent>
         </Card>
      );
    }
    
    if (!reportCardData) {
      return (
        <Card className="no-print">
          <CardContent className="p-10 text-center">
            <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No Report Card Found</p>
            <p className="text-muted-foreground">Your report card for the selected term has not been published yet or does not exist.</p>
          </CardContent>
        </Card>
      );
    }

    const templateKey = reportCardData.reportCardTemplateKey;

    if (templateKey === 'nursing_college') {
      const nursingProps = getNursingProps();
      if (!nursingProps) return <p>Error processing nursing report data.</p>;
      return (
        <div className="printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md">
          <NursingCollegeReportCard {...nursingProps} />
        </div>
      );
    }

    if (templateKey === 'cbse_state') {
      const frontProps = getFrontProps();
      const backProps = getBackProps();
      if (!frontProps || !backProps) return <p>Error processing CBSE report data.</p>;
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

    return (
      <Card className="no-print border-destructive">
        <CardHeader>
          <CardTitle>Unknown Report Card Format</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The school has selected a report card format that is not recognized by the system.</p>
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
          <CardDescription>View your academic performance and report card.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
             <div className="w-full sm:w-auto">
                <Label htmlFor="termSelect">Select Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={isLoading || availableTerms.length === 0}>
                    <SelectTrigger id="termSelect" className="max-w-xs"><SelectValue placeholder={availableTerms.length === 0 ? "No terms found" : "Select Term"} /></SelectTrigger>
                    <SelectContent>{availableTerms.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent>
                </Select>
             </div>
            <Button onClick={() => authUser && selectedTerm && fetchReportData(authUser, selectedTerm)} disabled={isLoading || !selectedTerm}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
                Fetch Report
            </Button>
        </CardContent>
      </Card>
      
      {!isLoading && reportCardData && (
        <div className="flex justify-end gap-2 no-print mb-4">
            {reportCardData.reportCardTemplateKey === 'cbse_state' && (
              <Button onClick={() => setShowBackSide(prev => !prev)} variant="outline">
                  {showBackSide ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                  {showBackSide ? "View Front" : "View Back"}
              </Button>
            )}
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Report Card</Button>
        </div>
      )}
      
      {renderReportCard()}
    </div>
  );
}

export default StudentResultsPage;
