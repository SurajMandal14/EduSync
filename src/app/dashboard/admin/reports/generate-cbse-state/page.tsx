
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import CBSEStateFront, { 
    type StudentData as FrontStudentData, 
    type SubjectFAData as FrontSubjectFAData, 
    type MarksEntry as FrontMarksEntryTypeImport, 
} from '@/components/report-cards/CBSEStateFront';
import CBSEStateBack, { 
    type ReportCardSASubjectEntry, 
    type ReportCardAttendanceMonth, 
    type SAPaperScore 
} from '@/components/report-cards/CBSEStateBack';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Printer, RotateCcw, Eye, EyeOff, Save, Loader2, User, School as SchoolIconUI, Search as SearchIcon, AlertTriangle, UploadCloud, XOctagon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuthUser, UserRole } from '@/types/user';
import { saveReportCard, getStudentReportCard, setReportCardPublicationStatus } from '@/app/actions/reports';
import type { ReportCardData, FormativeAssessmentEntryForStorage } from '@/types/report';
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudentDetailsForReportCard, type StudentDetailsForReportCard } from '@/app/actions/schoolUsers';
import { getClassDetailsById } from '@/app/actions/classes';
import { getSchoolById } from '@/app/actions/schools';
import type { SchoolClassSubject } from '@/types/classes';
import type { School } from '@/types/school';
import { getStudentMarksForReportCard, getAvailableTermsForStudent } from '@/app/actions/marks'; 
import type { MarkEntry as MarkEntryType } from '@/types/marks'; 


type FrontMarksEntry = FrontMarksEntryTypeImport;

// Helper function to determine paper names for common subjects
const getPapersForSubject = (subjectName: string): string[] => {
    if (subjectName === "Science") return ["Physics", "Biology"];
    if (["English", "Maths", "Social"].includes(subjectName)) return ["I", "II"]; // Assuming "Social" is Social Studies
    return ["I"]; // Default to one paper for other subjects (Telugu, Hindi, etc.)
};

const initializeSaDataFromClassSubjects = (
    classSubjects: SchoolClassSubject[],
    defaultMaxSA: number = 80 // Default SA max marks
): ReportCardSASubjectEntry[] => {
    if (!classSubjects || classSubjects.length === 0) return [];
    
    const saStructure: ReportCardSASubjectEntry[] = [];
    classSubjects.forEach(subject => {
        const papers = getPapersForSubject(subject.name);
        papers.forEach(paperName => {
            saStructure.push({
                subjectName: subject.name,
                paper: paperName,
                sa1: { marks: null, maxMarks: defaultMaxSA },
                sa2: { marks: null, maxMarks: defaultMaxSA },
                faTotal200M: null,
            });
        });
    });
    return saStructure;
};


const getDefaultFaMarksEntryFront = (): FrontMarksEntry => ({ tool1: null, tool2: null, tool3: null, tool4: null });
const getDefaultSubjectFaDataFront = (subjects: SchoolClassSubject[]): Record<string, FrontSubjectFAData> => {
    const initialFaMarks: Record<string, FrontSubjectFAData> = {};
    (subjects || []).forEach(subject => {
        initialFaMarks[subject.name] = {
            fa1: getDefaultFaMarksEntryFront(),
            fa2: getDefaultFaMarksEntryFront(),
            fa3: getDefaultFaMarksEntryFront(),
            fa4: getDefaultFaMarksEntryFront(),
        };
    });
    return initialFaMarks;
};

const defaultCoMarksFront: any[] = []; 

const defaultStudentDataFront: FrontStudentData = {
  udiseCodeSchoolName: '', studentName: '', fatherName: '', motherName: '',
  class: '', section: '', studentIdNo: '', rollNo: '', medium: 'English',
  dob: '', admissionNo: '', aadharNo: '',
};

const defaultAttendanceDataBack: ReportCardAttendanceMonth[] = Array(11).fill(null).map(() => ({ workingDays: null, presentDays: null }));


const calculateFaTotal200MForRow = (subjectNameForBack: string, paperNameForBack: string, currentFaMarks: Record<string, FrontSubjectFAData>): number | null => {
  const faSubjectKey = (subjectNameForBack === "Science") ? "Science" : subjectNameForBack;
  const subjectFaData = currentFaMarks[faSubjectKey];

  if (!subjectFaData) return null;

  let overallTotal = 0;
  (['fa1', 'fa2', 'fa3', 'fa4'] as const).forEach(faPeriodKey => {
    const periodMarks = subjectFaData[faPeriodKey];
    if (periodMarks) {
      overallTotal += (periodMarks.tool1 || 0) + (periodMarks.tool2 || 0) + (periodMarks.tool3 || 0) + (periodMarks.tool4 || 0);
    }
  });
  
  // For Science, if it's Physics or Biology, the FA total is for the entire Science subject,
  // so it should be shown for both.
  return overallTotal > 200 ? 200 : overallTotal; 
};


export default function GenerateCBSEStateReportPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [registrationNoInput, setRegistrationNoInput] = useState<string>(""); 
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("");

  const [loadedStudent, setLoadedStudent] = useState<StudentDetailsForReportCard | null>(null);
  const [loadedClassSubjects, setLoadedClassSubjects] = useState<SchoolClassSubject[]>([]);
  const [teacherEditableSubjects, setTeacherEditableSubjects] = useState<string[]>([]);
  const [loadedSchool, setLoadedSchool] = useState<School | null>(null);
  const [isLoadingStudentAndClassData, setIsLoadingStudentAndClassData] = useState(false);

  const [studentData, setStudentData] = useState<FrontStudentData>(defaultStudentDataFront);
  const [faMarks, setFaMarks] = useState<Record<string, FrontSubjectFAData>>(getDefaultSubjectFaDataFront([])); 
  const [coMarks, setCoMarks] = useState<any[]>(defaultCoMarksFront); 
  const [frontSecondLanguage, setFrontSecondLanguage] = useState<'Hindi' | 'Telugu'>('Hindi');

  const [saData, setSaData] = useState<ReportCardSASubjectEntry[]>([]); 
  const [attendanceData, setAttendanceData] = useState<ReportCardAttendanceMonth[]>(defaultAttendanceDataBack);
  const [finalOverallGradeInput, setFinalOverallGradeInput] = useState<string | null>(null);

  const [showBackSide, setShowBackSide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [loadedReportId, setLoadedReportId] = useState<string | null>(null);
  const [loadedReportIsPublished, setLoadedReportIsPublished] = useState<boolean | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [defaultSaMaxMarks, setDefaultSaMaxMarks] = useState(80); // Default SA max from teacher page


  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && (parsedUser.role === 'admin' || parsedUser.role === 'teacher') && parsedUser.schoolId) { 
          setAuthUser(parsedUser);
        } else {
          toast({ variant: "destructive", title: "Access Denied", description: "You must be an admin or teacher." });
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
      }
    }
  }, [toast]);

  const initializeReportState = (subjects: SchoolClassSubject[] = []) => {
    setLoadedStudent(null);
    setLoadedClassSubjects(subjects);
    setTeacherEditableSubjects([]);
    setLoadedSchool(null);
    setStudentData(defaultStudentDataFront);
    setFaMarks(getDefaultSubjectFaDataFront(subjects));
    setCoMarks(defaultCoMarksFront);
    setSaData(initializeSaDataFromClassSubjects(subjects, defaultSaMaxMarks));
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);
    setLoadedReportId(null);
    setLoadedReportIsPublished(null);
    setAvailableTerms([]);
    setSelectedTerm("");
  };

  const handleLoadStudentAndClassData = async () => {
    if (!registrationNoInput.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please enter a Registration Number." });
      return;
    }
    if (!authUser || !authUser.schoolId || !authUser._id) {
        toast({ variant: "destructive", title: "Error", description: "Admin/Teacher session or school ID missing." });
        return;
    }

    setIsLoadingStudentAndClassData(true);
    initializeReportState();
    
    try {
      const studentRes = await getStudentDetailsForReportCard(registrationNoInput, authUser.schoolId.toString());
      
      if (!studentRes.success || !studentRes.student) {
        toast({ variant: "destructive", title: "Student Not Found", description: studentRes.message || `Could not find student with Registration No: ${registrationNoInput}.` });
        setIsLoadingStudentAndClassData(false);
        return;
      }
      
      const currentStudent = studentRes.student;
      setLoadedStudent(currentStudent);

      // Fetch available academic years and terms for this student
      const yearsAndTermsRes = await getAvailableTermsForStudent(currentStudent._id, authUser.schoolId.toString());
      if(yearsAndTermsRes.success && yearsAndTermsRes.data && yearsAndTermsRes.data.length > 0) {
        setAvailableTerms(yearsAndTermsRes.data);
        if (yearsAndTermsRes.data.length > 0) {
          setSelectedTerm(yearsAndTermsRes.data[0]); // Select first available term by default
        }
      } else {
        toast({variant: "info", title: "No Marks Data", description: "No existing marks data found for this student to select from. You can create a new 'Annual' report."})
        setAvailableTerms(["Annual"]);
        setSelectedTerm("Annual");
      }

      const schoolRes = await getSchoolById(currentStudent.schoolId!);
      if(schoolRes.success && schoolRes.school) setLoadedSchool(schoolRes.school);

      if (currentStudent.classId) {
        const classRes = await getClassDetailsById(currentStudent.classId, currentStudent.schoolId!);
        if (classRes.success && classRes.classDetails) {
          setLoadedClassSubjects(classRes.classDetails.subjects || []);
        } else {
            toast({ variant: "destructive", title: "Class Details Error", description: classRes.message || `Could not load class details for class ID: ${currentStudent.classId}.`});
        }
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error Loading Data", description: "An unexpected error occurred."});
      console.error("Error loading student/class data:", error);
    } finally {
      setIsLoadingStudentAndClassData(false);
    }
  };
  
  // This effect will trigger when a student is loaded and the year/term changes
  const loadReportForSelectedYearAndTerm = useCallback(async () => {
    if (!loadedStudent || !selectedTerm) {
        return;
    }
    setIsLoadingStudentAndClassData(true);
    
    // Reset specific report data before loading new
    setFaMarks(getDefaultSubjectFaDataFront(loadedClassSubjects));
    setCoMarks(defaultCoMarksFront);
    setSaData(initializeSaDataFromClassSubjects(loadedClassSubjects, defaultSaMaxMarks));
    setAttendanceData(defaultAttendanceDataBack);
    setFinalOverallGradeInput(null);
    setLoadedReportId(null);
    setLoadedReportIsPublished(null);
    
    try {
        const classRes = await getClassDetailsById(loadedStudent.classId!, loadedStudent.schoolId!);
        let currentLoadedClassSubjects: SchoolClassSubject[] = [];

        if (classRes.success && classRes.classDetails) {
            currentLoadedClassSubjects = classRes.classDetails.subjects || [];
            setFrontSecondLanguage(classRes.classDetails.secondLanguageSubjectName === "Telugu" ? "Telugu" : "Hindi");
            if (authUser?.role === 'teacher') {
                setTeacherEditableSubjects(currentLoadedClassSubjects.filter(s => s.teacherId === authUser._id).map(s => s.name));
            }
        }
        setStudentData({
            udiseCodeSchoolName: loadedSchool?.schoolName || '', 
            studentName: loadedStudent.name || '',
            fatherName: loadedStudent.fatherName || '',
            motherName: loadedStudent.motherName || '',
            class: classRes.classDetails?.name || '', 
            section: loadedStudent.section || '',
            studentIdNo: loadedStudent._id || '', 
            rollNo: loadedStudent.rollNo || '',
            dob: loadedStudent.dob || '',
            admissionNo: loadedStudent.admissionId || '',
            aadharNo: loadedStudent.aadharNo || '',
          });

        const existingReportRes = await getStudentReportCard(loadedStudent._id, loadedStudent.schoolId!, selectedTerm, false);

        if (existingReportRes.success && existingReportRes.reportCard) {
            const report = existingReportRes.reportCard;
            toast({title: "Existing Report Loaded", description: `Report for ${report.studentInfo.studentName} (${report.term}) loaded.`});
            
            setStudentData(report.studentInfo);
            setFrontSecondLanguage(report.secondLanguage || 'Hindi');

            const loadedFaMarksState: Record<string, FrontSubjectFAData> = getDefaultSubjectFaDataFront(currentLoadedClassSubjects);
            report.formativeAssessments.forEach(reportSubjectFa => {
                if (loadedFaMarksState[reportSubjectFa.subjectName]) {
                    loadedFaMarksState[reportSubjectFa.subjectName] = { fa1: reportSubjectFa.fa1, fa2: reportSubjectFa.fa2, fa3: reportSubjectFa.fa3, fa4: reportSubjectFa.fa4 };
                }
            });
            setFaMarks(loadedFaMarksState);
            setCoMarks(report.coCurricularAssessments || defaultCoMarksFront);
            setSaData(report.summativeAssessments);
            setAttendanceData(report.attendance.length > 0 ? report.attendance : defaultAttendanceDataBack);
            setFinalOverallGradeInput(report.finalOverallGrade);
            setLoadedReportId(report._id!.toString());
            setLoadedReportIsPublished(report.isPublished || false);
        } else {
             toast({title: "No Saved Report", description: "Fetching individual marks for new report."});
             const marksResult = await getStudentMarksForReportCard(loadedStudent._id, loadedStudent.schoolId!, loadedStudent.classId!, selectedTerm);
             // ... populate from marks logic as before ...
        }

    } catch (e) {
        console.error("Error loading report for year/term:", e);
        toast({variant: "destructive", title: "Error", description: "Could not load report data for selection."})
    } finally {
        setIsLoadingStudentAndClassData(false);
    }
  }, [loadedStudent, selectedTerm, loadedSchool, authUser, toast, loadedClassSubjects, defaultSaMaxMarks]);

  useEffect(() => {
    if(selectedTerm) {
        loadReportForSelectedYearAndTerm();
    }
  }, [selectedTerm, loadReportForSelectedYearAndTerm]);

  const handleStudentDataChange = (field: keyof FrontStudentData, value: string) => {
    if (isFieldDisabledForRole()) return; 
    setStudentData(prev => ({ ...prev, [field]: value }));
  };

  const handleFaMarksChange = (subjectIdentifier: string, faPeriod: keyof SubjectFAData, toolKey: keyof FrontMarksEntry, value: string) => {
    if (isFieldDisabledForRole(subjectIdentifier)) return; 

    const numValue = parseInt(value, 10);
    const maxMark = toolKey === 'tool4' ? 20 : 10; 
    const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), maxMark);
    
    setFaMarks(prevFaMarks => {
      const currentSubjectMarks = prevFaMarks[subjectIdentifier] || {
        fa1: getDefaultFaMarksEntryFront(), fa2: getDefaultFaMarksEntryFront(),
        fa3: getDefaultFaMarksEntryFront(), fa4: getDefaultFaMarksEntryFront(),
      };
      const updatedPeriodMarks = { 
        ...(currentSubjectMarks[faPeriod] || getDefaultFaMarksEntryFront()), 
        [toolKey]: validatedValue 
      };
      const newFaMarks = { ...prevFaMarks, [subjectIdentifier]: { ...currentSubjectMarks, [faPeriod]: updatedPeriodMarks }};
      
      setSaData(currentSaData =>
        currentSaData.map(row => ({
          ...row,
          faTotal200M: calculateFaTotal200MForRow(row.subjectName, row.paper, newFaMarks)
        }))
      );
      return newFaMarks;
    });
  };

  const handleCoMarksChange = (subjectIndex: number, saPeriodKey: 'sa1' | 'sa2' | 'sa3', type: 'Marks' | 'Max', value: string) => {
    if (isFieldDisabledForRole("CoCurricular")) return;
  };

  const handleSaDataChange = (rowIndex: number, period: 'sa1' | 'sa2', field: 'marks' | 'maxMarks', value: string) => {
    const subjectName = saData[rowIndex]?.subjectName;
    if (isFieldDisabledForRole(subjectName)) return; 
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.max(numValue, 0); 
    
    setSaData(prev => prev.map((row, idx) => {
        if (idx === rowIndex) {
            const updatedRow = { ...row };
            if (period === 'sa1') {
                updatedRow.sa1 = { ...(updatedRow.sa1 || {marks: null, maxMarks: null}), [field]: validatedValue };
            } else if (period === 'sa2') {
                updatedRow.sa2 = { ...(updatedRow.sa2 || {marks: null, maxMarks: null}), [field]: validatedValue };
            }
            return updatedRow;
        }
        return row;
    }));
  };
  
  const handleFaTotalChangeBack = (rowIndex: number, value: string) => {
    const subjectName = saData[rowIndex]?.subjectName;
    if (isFieldDisabledForRole(subjectName)) return; 
     const numValue = parseInt(value, 10);
     const validatedValue = isNaN(numValue) ? null : Math.min(Math.max(numValue, 0), 200);
     setSaData(prev => prev.map((row, idx) => 
        idx === rowIndex ? { ...row, faTotal200M: validatedValue } : row
     ));
  };

  const handleAttendanceDataChange = (monthIndex: number, type: 'workingDays' | 'presentDays', value: string) => {
    if (isFieldDisabledForRole()) return;
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : Math.max(numValue, 0);
    setAttendanceData(prev => prev.map((month, idx) => 
        idx === monthIndex ? { ...month, [type]: validatedValue } : month
    ));
  };
  
  const isFieldDisabledForRole = (subjectName?: string): boolean => {
    const currentUserRole = authUser?.role as UserRole;
    if (currentUserRole === 'student') return true;
    if (currentUserRole === 'admin' && !!loadedStudent) return true; 
    if (currentUserRole === 'teacher') {
      if (!subjectName) return true; 
      if (subjectName === "Science" && (teacherEditableSubjects.includes("Physics") || teacherEditableSubjects.includes("Biology"))) return false;
      return !teacherEditableSubjects.includes(subjectName);
    }
    return false; 
  };

  const handlePrint = () => window.print();
  
  const handleResetData = () => {
    setRegistrationNoInput("");
    initializeReportState();
    toast({ title: "Data Reset", description: "All fields have been reset."});
  }

  const handleSaveReportCard = async () => {
    if (!authUser || !authUser.schoolId || !authUser._id) {
      toast({ variant: "destructive", title: "Error", description: "Admin/Teacher session not found." });
      return;
    }
    if (!loadedStudent || !loadedStudent._id || !selectedTerm) {
      toast({ variant: "destructive", title: "Missing Data", description: "Please load student and select a term first." });
      return;
    }
    if (!loadedSchool || !loadedSchool.reportCardTemplate) {
        toast({ variant: "destructive", title: "Configuration Error", description: "School report card template is not configured." });
        return;
    }

    setIsSaving(true);
    const formativeAssessmentsForStorage: FormativeAssessmentEntryForStorage[] = Object.entries(faMarks)
      .map(([subjectName, marksData]) => ({ subjectName, ...marksData }));
    
    for (const saEntry of saData) {
        if (saEntry.sa1.marks !== null && saEntry.sa1.maxMarks !== null && saEntry.sa1.marks > saEntry.sa1.maxMarks) {
            toast({ variant: "destructive", title: "Validation Error", description: `${saEntry.subjectName} (${saEntry.paper}) SA1 marks (${saEntry.sa1.marks}) exceed max marks (${saEntry.sa1.maxMarks}).` });
            setIsSaving(false); return;
        }
        if (saEntry.sa2.marks !== null && saEntry.sa2.maxMarks !== null && saEntry.sa2.marks > saEntry.sa2.maxMarks) {
            toast({ variant: "destructive", title: "Validation Error", description: `${saEntry.subjectName} (${saEntry.paper}) SA2 marks (${saEntry.sa2.marks}) exceed max marks (${saEntry.sa2.maxMarks}).` });
            setIsSaving(false); return;
        }
    }


    const reportPayload: Omit<ReportCardData, '_id' | 'createdAt' | 'updatedAt' | 'isPublished'> = {
      studentId: loadedStudent._id, 
      schoolId: (loadedSchool?._id || authUser.schoolId).toString(),
      reportCardTemplateKey: loadedSchool.reportCardTemplate,
      studentInfo: studentData,
      formativeAssessments: formativeAssessmentsForStorage, 
      coCurricularAssessments: coMarks,
      secondLanguage: frontSecondLanguage, 
      summativeAssessments: saData, 
      attendance: attendanceData,
      finalOverallGrade: finalOverallGradeInput, 
      generatedByAdminId: authUser._id.toString(), 
      term: selectedTerm,
    };
    const result = await saveReportCard(reportPayload);
    setIsSaving(false);
    if (result.success) {
      toast({ title: "Report Card Saved", description: result.message + (result.reportCardId ? ` ID: ${result.reportCardId}` : '') });
      if(result.reportCardId) setLoadedReportId(result.reportCardId);
      if(result.isPublished !== undefined) setLoadedReportIsPublished(result.isPublished);
    } else {
      toast({ variant: "destructive", title: "Save Failed", description: result.error || result.message });
    }
  };

  const handleTogglePublish = async () => {
    if (!loadedReportId || !authUser || !authUser.schoolId || loadedReportIsPublished === null) {
        toast({ variant: "destructive", title: "Error", description: "No report loaded or publication status unknown."});
        return;
    }
    setIsPublishing(true);
    const result = await setReportCardPublicationStatus(loadedReportId, authUser.schoolId.toString(), !loadedReportIsPublished);
    setIsPublishing(false);
    if (result.success && result.isPublished !== undefined) {
        setLoadedReportIsPublished(result.isPublished);
        toast({ title: "Status Updated", description: result.message });
    } else {
        toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  };

  const currentUserRole = authUser?.role as UserRole;
  const canSave = (authUser?.role === 'admin' || authUser?.role === 'teacher') && !!loadedStudent && !isSaving;
  const canPublish = authUser?.role === 'admin' && !!loadedStudent && !!loadedReportId && !isPublishing;

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-report-card, .printable-report-card * { visibility: visible !important; }
          .printable-report-card { 
            position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; 
            margin: 0 !important; padding: 0 !important; transform: scale(0.95); transform-origin: top left;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <FileText className="mr-2 h-6 w-6" /> Generate CBSE State Pattern Report Card
          </CardTitle>
          <CardDescription>
            Logged in as: <span className="font-semibold capitalize">{authUser?.role || 'N/A'}</span>. 
            Enter Student's Registration Number to load data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="w-full sm:w-auto">
              <Label htmlFor="registrationNoInput" className="mb-1 flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Enter Registration No.</Label>
              <Input 
                id="registrationNoInput" placeholder="Enter Registration No." value={registrationNoInput}
                onChange={(e) => setRegistrationNoInput(e.target.value)} className="w-full sm:min-w-[200px]"
                disabled={isLoadingStudentAndClassData || isSaving || isPublishing}
              />
            </div>
             {authUser?.schoolId && 
              <div className="w-full sm:w-auto">
                <Label className="mb-1 flex items-center"><SchoolIconUI className="mr-2 h-4 w-4 text-muted-foreground"/>School ID (Auto)</Label>
                <Input value={authUser.schoolId.toString()} disabled className="w-full sm:min-w-[180px]" />
              </div>
            }
            <Button onClick={handleLoadStudentAndClassData} disabled={isLoadingStudentAndClassData || isSaving || isPublishing || !registrationNoInput.trim() || !authUser || !authUser.schoolId}>
                {isLoadingStudentAndClassData && !availableTerms ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchIcon className="mr-2 h-4 w-4"/>}
                Load Student
            </Button>
          </div>
          {availableTerms.length > 0 && (
             <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="w-full sm:w-auto">
                    <Label htmlFor="termSelect">Select Term</Label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={isLoadingStudentAndClassData}>
                        <SelectTrigger id="termSelect"><SelectValue placeholder="Select Term" /></SelectTrigger>
                        <SelectContent>{(availableTerms).map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
             </div>
          )}
          {loadedReportId && loadedReportIsPublished !== null && (
             <p className="text-sm font-medium">
                Current Report Status: <span className={loadedReportIsPublished ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                    {loadedReportIsPublished ? "Published" : "Not Published"}
                </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveReportCard} disabled={!canSave}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              {isSaving ? "Saving..." : "Save Report Card"}
            </Button>
            {currentUserRole === 'admin' && (
                <Button onClick={handleTogglePublish} disabled={!canPublish}>
                    {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (loadedReportIsPublished ? <XOctagon className="mr-2 h-4 w-4"/> : <UploadCloud className="mr-2 h-4 w-4"/>)}
                    {isPublishing ? "Updating..." : (loadedReportIsPublished ? "Unpublish Report" : "Publish Report")}
                </Button>
            )}
            <Button onClick={handlePrint} variant="outline" disabled={!loadedStudent || !selectedTerm}><Printer className="mr-2 h-4 w-4"/> Print Preview</Button>
            <Button onClick={() => setShowBackSide(prev => !prev)} variant="secondary" className="ml-auto mr-2" disabled={!loadedStudent || !selectedTerm}>
                {showBackSide ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
                {showBackSide ? "View Front" : "View Back"}
            </Button>
            <Button onClick={handleResetData} variant="destructive"><RotateCcw className="mr-2 h-4 w-4"/> Reset All</Button>
          </div>
        </CardContent>
      </Card>

      {isLoadingStudentAndClassData && (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading student and report information...</p>
        </div>
      )}

      {!isLoadingStudentAndClassData && loadedStudent && selectedTerm && authUser && (
        <>
          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${showBackSide ? 'hidden' : ''}`}>
            <CBSEStateFront
              studentData={studentData} onStudentDataChange={handleStudentDataChange}
              academicSubjects={loadedClassSubjects} 
              faMarks={faMarks} onFaMarksChange={handleFaMarksChange} 
              coMarks={coMarks} onCoMarksChange={handleCoMarksChange} 
              secondLanguage={frontSecondLanguage} onSecondLanguageChange={(val) => { if(!isFieldDisabledForRole()) setFrontSecondLanguage(val)}}
              academicYear={selectedTerm} onAcademicYearChange={(val) => {if(!isFieldDisabledForRole()) setSelectedTerm(val)}}
              currentUserRole={currentUserRole}
              editableSubjects={teacherEditableSubjects}
            />
          </div>
          
          {showBackSide && <div className="page-break no-print"></div>}

          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${!showBackSide ? 'hidden' : ''}`}>
            <CBSEStateBack
              saData={saData} onSaDataChange={handleSaDataChange} 
              onFaTotalChange={handleFaTotalChangeBack} 
              attendanceData={attendanceData} onAttendanceDataChange={handleAttendanceDataChange}
              finalOverallGradeInput={finalOverallGradeInput} onFinalOverallGradeInputChange={setFinalOverallGradeInput}
              secondLanguageSubjectName={frontSecondLanguage} 
              currentUserRole={currentUserRole}
              editableSubjects={teacherEditableSubjects} 
            />
          </div>
        </>
      )}
      {!isLoadingStudentAndClassData && !loadedStudent && registrationNoInput && (
          <Card className="no-print border-destructive">
            <CardHeader className="flex-row items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive"/>
                <CardTitle className="text-destructive">Student Data Not Loaded</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Student data could not be loaded for Registration No: <span className="font-semibold">{registrationNoInput}</span>.</p>
                <p className="mt-1">Please ensure the Registration Number is correct and the student is properly configured in the system (assigned to a class, etc.).</p>
            </CardContent>
          </Card>
      )}
       {!isLoadingStudentAndClassData && !loadedStudent && !registrationNoInput && (
          <Card className="no-print">
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Enter a Registration Number and click "Load Student" to begin.</p>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
