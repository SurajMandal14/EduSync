
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
import { getStudentDetailsForReportCard, type StudentDetailsForReportCard } from '@/app/actions/schoolUsers';
import { getClassDetailsById } from '@/app/actions/classes';
import { getSchoolById } from '@/app/actions/schools';
import type { SchoolClassSubject } from '@/types/classes';
import type { School } from '@/types/school';
import { getStudentMarksForReportCard } from '@/app/actions/marks'; 
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
  dob: '', admissionNo: '', examNo: '', aadharNo: '',
};

const defaultAttendanceDataBack: ReportCardAttendanceMonth[] = Array(11).fill(null).map(() => ({ workingDays: null, presentDays: null }));

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
  
  const [admissionIdInput, setAdmissionIdInput] = useState<string>(""); 
  const [loadedStudent, setLoadedStudent] = useState<StudentDetailsForReportCard | null>(null);
  const [loadedClassSubjects, setLoadedClassSubjects] = useState<SchoolClassSubject[]>([]);
  const [teacherEditableSubjects, setTeacherEditableSubjects] = useState<string[]>([]);
  const [loadedSchool, setLoadedSchool] = useState<School | null>(null);
  const [isLoadingStudentAndClassData, setIsLoadingStudentAndClassData] = useState(false);

  const [studentData, setStudentData] = useState<FrontStudentData>(defaultStudentDataFront);
  const [faMarks, setFaMarks] = useState<Record<string, FrontSubjectFAData>>(getDefaultSubjectFaDataFront([])); 
  const [coMarks, setCoMarks] = useState<any[]>(defaultCoMarksFront); 
  const [frontSecondLanguage, setFrontSecondLanguage] = useState<'Hindi' | 'Telugu'>('Hindi');
  const [frontAcademicYear, setFrontAcademicYear] = useState<string>(getCurrentAcademicYear());

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
  };

  const handleLoadStudentAndClassData = async () => {
    if (!admissionIdInput.trim()) {
      toast({ variant: "destructive", title: "Missing Input", description: "Please enter an Admission ID." });
      return;
    }
    if (!authUser || !authUser.schoolId || !authUser._id) {
        toast({ variant: "destructive", title: "Error", description: "Admin/Teacher session or school ID missing." });
        return;
    }

    setIsLoadingStudentAndClassData(true);
    
    try {
      const studentRes = await getStudentDetailsForReportCard(admissionIdInput, authUser.schoolId.toString());
      
      if (!studentRes.success || !studentRes.student) {
        toast({ variant: "destructive", title: "Student Not Found", description: studentRes.message || `Could not find student with Admission ID: ${admissionIdInput}.` });
        setIsLoadingStudentAndClassData(false);
        initializeReportState(); 
        return;
      }
      const currentStudent = studentRes.student;
      setLoadedStudent(currentStudent);
      
      const schoolRes = await getSchoolById(currentStudent.schoolId!);
      if(schoolRes.success && schoolRes.school) {
        setLoadedSchool(schoolRes.school);
      } else {
        toast({variant: "warning", title: "School Info", description: "Could not load school details for report header."});
      }

      let currentLoadedClassSubjects: SchoolClassSubject[] = [];
      if (currentStudent.classId) {
        const classRes = await getClassDetailsById(currentStudent.classId, currentStudent.schoolId!);
        if (classRes.success && classRes.classDetails) {
          currentLoadedClassSubjects = classRes.classDetails.subjects || [];
          setLoadedClassSubjects(currentLoadedClassSubjects);
          setFrontSecondLanguage(classRes.classDetails.secondLanguageSubjectName === "Telugu" ? "Telugu" : "Hindi");
          
          if (authUser.role === 'teacher' && classRes.classDetails.subjects) {
            const editableSubs = classRes.classDetails.subjects
              .filter(sub => sub.teacherId === authUser._id)
              .map(sub => sub.name);
            setTeacherEditableSubjects(editableSubs);
          }

          setStudentData(prev => ({
            ...prev,
            udiseCodeSchoolName: schoolRes.school?.schoolName || '', 
            studentName: currentStudent.name || '',
            fatherName: currentStudent.fatherName || '',
            motherName: currentStudent.motherName || '',
            class: classRes.classDetails?.name || '', 
            section: currentStudent.section || '',
            studentIdNo: currentStudent._id || '', 
            rollNo: currentStudent.rollNo || '',
            dob: currentStudent.dob || '',
            admissionNo: currentStudent.admissionId || '',
            examNo: currentStudent.examNo || '',
            aadharNo: currentStudent.aadharNo || '',
          }));
        } else {
          toast({ variant: "destructive", title: "Class Details Error", description: classRes.message || `Could not load class details for class ID: ${currentStudent.classId}.`});
          setIsLoadingStudentAndClassData(false);
          initializeReportState();
          return; 
        }
      } else {
         toast({ variant: "destructive", title: "Class Missing", description: `Student ${currentStudent.name} is not assigned to a class.`});
         setIsLoadingStudentAndClassData(false);
         initializeReportState();
         return;
      }
      
      const existingReportRes = await getStudentReportCard(
          currentStudent._id, 
          currentStudent.schoolId!, 
          frontAcademicYear,
          undefined, 
          false 
      );

      if (existingReportRes.success && existingReportRes.reportCard) {
          const report = existingReportRes.reportCard;
          toast({title: "Existing Report Loaded", description: `Report for ${report.studentInfo.studentName} (${report.academicYear}) loaded.`});
          setStudentData(report.studentInfo);
          setFrontSecondLanguage(report.secondLanguage || 'Hindi');
          setFrontAcademicYear(report.academicYear);

          const loadedFaMarksState: Record<string, FrontSubjectFAData> = getDefaultSubjectFaDataFront(currentLoadedClassSubjects);
          report.formativeAssessments.forEach(reportSubjectFa => {
              if (loadedFaMarksState[reportSubjectFa.subjectName]) {
                loadedFaMarksState[reportSubjectFa.subjectName] = {
                    fa1: reportSubjectFa.fa1, fa2: reportSubjectFa.fa2,
                    fa3: reportSubjectFa.fa3, fa4: reportSubjectFa.fa4,
                };
              }
          });
          setFaMarks(loadedFaMarksState);
          setCoMarks(report.coCurricularAssessments || defaultCoMarksFront);
          
          // Ensure saData uses the dynamically determined subjects if the saved report is old.
          // If the saved report already has the new structure, use it. Otherwise, initialize and map.
          if (report.summativeAssessments && report.summativeAssessments.every(sa => 'paper' in sa && 'faTotal200M' in sa)) {
            setSaData(report.summativeAssessments);
          } else {
            // If old structure, initialize based on class subjects and try to map (might be lossy)
            let tempSaData = initializeSaDataFromClassSubjects(currentLoadedClassSubjects, defaultSaMaxMarks);
            // Attempt to map old SA data to new structure if possible (this part is complex and error-prone)
            // For simplicity, if old data is found, we might just initialize fresh.
            // The key is that new saves will use the ReportCardSASubjectEntry structure.
             tempSaData = tempSaData.map(row => ({
                ...row,
                faTotal200M: calculateFaTotal200MForRow(row.subjectName, row.paper, loadedFaMarksState)
             }));
            setSaData(tempSaData);
            toast({variant: "info", title: "SA Data Mapped", description: "SA data from an older report format was mapped. Please review."});
          }

          setAttendanceData(report.attendance.length > 0 ? report.attendance : defaultAttendanceDataBack);
          setFinalOverallGradeInput(report.finalOverallGrade);
          setLoadedReportId(report._id!.toString());
          setLoadedReportIsPublished(report.isPublished || false);

      } else { 
          setLoadedReportId(null);
          setLoadedReportIsPublished(null);
          toast({title: "No Saved Report", description: "Fetching individual marks for new report."});

          const marksResult = await getStudentMarksForReportCard(
            currentStudent._id,
            currentStudent.schoolId!,
            frontAcademicYear, 
            currentStudent.classId! 
          );

          const newFaMarksForState: Record<string, FrontSubjectFAData> = getDefaultSubjectFaDataFront(currentLoadedClassSubjects);
          let tempSaDataForNewReport = initializeSaDataFromClassSubjects(currentLoadedClassSubjects, defaultSaMaxMarks);

          if (marksResult.success && marksResult.marks) {
            const allFetchedMarks = marksResult.marks;

            currentLoadedClassSubjects.forEach(subject => {
              const subjectIdentifier = subject.name; 
              const subjectSpecificFaMarks = allFetchedMarks.filter(
                mark => mark.subjectName === subjectIdentifier &&
                        mark.academicYear === frontAcademicYear &&
                        mark.classId === currentStudent.classId &&
                        mark.assessmentName.startsWith("FA")
              );

              subjectSpecificFaMarks.forEach(mark => {
                const assessmentNameParts = mark.assessmentName.split('-'); 
                if (assessmentNameParts.length === 2) {
                  const faPeriodKey = assessmentNameParts[0].toLowerCase() as keyof FrontSubjectFAData; 
                  const toolKeyRaw = assessmentNameParts[1]; 
                  const toolKey = (toolKeyRaw.charAt(0).toLowerCase() + toolKeyRaw.slice(1)) as keyof FrontMarksEntry;

                  if (newFaMarksForState[subjectIdentifier] &&
                      newFaMarksForState[subjectIdentifier][faPeriodKey] &&
                      toolKey in newFaMarksForState[subjectIdentifier][faPeriodKey]) {
                    (newFaMarksForState[subjectIdentifier][faPeriodKey] as any)[toolKey] = mark.marksObtained;
                  }
                }
              });
            });
            
            allFetchedMarks.forEach((mark: MarkEntryType) => {
                if (mark.assessmentName.startsWith("SA1") || mark.assessmentName.startsWith("SA2")) {
                    const [saPeriod, paperTypeWithSuffix] = mark.assessmentName.split('-'); 
                    if (!paperTypeWithSuffix) return;

                    let targetSubjectNameInReport = mark.subjectName;
                    let targetPaperTypeOnReport: string;

                    if (mark.subjectName === "Science") {
                        targetPaperTypeOnReport = paperTypeWithSuffix === "Paper1" ? "Physics" : "Biology";
                    } else {
                        const papersForThisSubject = getPapersForSubject(mark.subjectName);
                        if (papersForThisSubject.length === 1) {
                            targetPaperTypeOnReport = papersForThisSubject[0]; // Should be "I"
                        } else { // Assumed 2 papers
                            targetPaperTypeOnReport = paperTypeWithSuffix === "Paper1" ? "I" : "II";
                        }
                    }
                    
                    const rowIndex = tempSaDataForNewReport.findIndex(row => row.subjectName === targetSubjectNameInReport && row.paper === targetPaperTypeOnReport);

                    if (rowIndex !== -1) {
                        const updatedRow = { ...tempSaDataForNewReport[rowIndex] }; 
                        if (saPeriod === "SA1") {
                            updatedRow.sa1 = { marks: mark.marksObtained, maxMarks: mark.maxMarks }; 
                        } else if (saPeriod === "SA2") {
                            updatedRow.sa2 = { marks: mark.marksObtained, maxMarks: mark.maxMarks }; 
                        }
                        tempSaDataForNewReport = tempSaDataForNewReport.map((row, idx) => idx === rowIndex ? updatedRow : row);
                    }
                }
            });
            setFaMarks(newFaMarksForState);
          } else { 
            if (!marksResult.success && marksResult.message) {
                toast({ variant: "info", title: "Marks Info", description: marksResult.message });
            } else if (!marksResult.success) {
                 toast({ variant: "warning", title: "Marks Info", description: "Could not load student marks for the report."});
            }
            setFaMarks(getDefaultSubjectFaDataFront(currentLoadedClassSubjects)); 
          }
          
          tempSaDataForNewReport = tempSaDataForNewReport.map(row => ({
              ...row,
              faTotal200M: calculateFaTotal200MForRow(row.subjectName, row.paper, newFaMarksForState)
          }));
          setSaData(tempSaDataForNewReport);
          setCoMarks(defaultCoMarksFront);
          setAttendanceData(defaultAttendanceDataBack);
          setFinalOverallGradeInput(null);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error Loading Data", description: "An unexpected error occurred."});
      console.error("Error loading student/class data:", error);
      initializeReportState();
    } finally {
      setIsLoadingStudentAndClassData(false);
    }
  };


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
    setAdmissionIdInput("");
    initializeReportState(loadedClassSubjects);
    toast({ title: "Data Reset", description: "All fields have been reset for current view."});
  }

  const handleSaveReportCard = async () => {
    if (!authUser || !authUser.schoolId || !authUser._id) {
      toast({ variant: "destructive", title: "Error", description: "Admin/Teacher session not found." });
      return;
    }
    if (!loadedStudent || !loadedStudent._id) {
      toast({ variant: "destructive", title: "Missing Student ID", description: "Please load student data first using Admission ID." });
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
      academicYear: frontAcademicYear, 
      reportCardTemplateKey: 'cbse_state', 
      studentInfo: studentData,
      formativeAssessments: formativeAssessmentsForStorage, 
      coCurricularAssessments: coMarks,
      secondLanguage: frontSecondLanguage, 
      summativeAssessments: saData, 
      attendance: attendanceData,
      finalOverallGrade: finalOverallGradeInput, 
      generatedByAdminId: authUser._id.toString(), 
      term: "Annual",
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
            Enter Student's Admission ID to load data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="w-full sm:w-auto">
              <Label htmlFor="admissionIdInput" className="mb-1 flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Enter Admission ID</Label>
              <Input 
                id="admissionIdInput" placeholder="Enter Admission ID" value={admissionIdInput}
                onChange={(e) => setAdmissionIdInput(e.target.value)} className="w-full sm:min-w-[200px]"
                disabled={isLoadingStudentAndClassData || isSaving || isPublishing}
              />
            </div>
             {authUser?.schoolId && 
              <div className="w-full sm:w-auto">
                <Label className="mb-1 flex items-center"><SchoolIconUI className="mr-2 h-4 w-4 text-muted-foreground"/>School ID (Auto)</Label>
                <Input value={authUser.schoolId.toString()} disabled className="w-full sm:min-w-[180px]" />
              </div>
            }
             <div className="w-full sm:w-auto">
              <Label htmlFor="academicYearInput" className="mb-1">Academic Year</Label>
              <Input
                id="academicYearInput" value={frontAcademicYear}
                onChange={e => setFrontAcademicYear(e.target.value)} placeholder="YYYY-YYYY"
                className="w-full sm:min-w-[150px]"
                disabled={isSaving || isPublishing || isFieldDisabledForRole()}
              />
            </div>
            <Button onClick={handleLoadStudentAndClassData} disabled={isLoadingStudentAndClassData || isSaving || isPublishing || !admissionIdInput.trim() || !authUser || !authUser.schoolId}>
                {isLoadingStudentAndClassData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchIcon className="mr-2 h-4 w-4"/>}
                Load Student Data
            </Button>
          </div>
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
            <Button onClick={handlePrint} variant="outline" disabled={!loadedStudent}><Printer className="mr-2 h-4 w-4"/> Print Preview</Button>
            <Button onClick={() => setShowBackSide(prev => !prev)} variant="secondary" className="ml-auto mr-2" disabled={!loadedStudent}>
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
          <p className="ml-4 text-lg">Loading student and class information...</p>
        </div>
      )}

      {!isLoadingStudentAndClassData && loadedStudent && authUser && (
        <>
          <div className={`printable-report-card bg-white p-2 sm:p-4 rounded-lg shadow-md ${showBackSide ? 'hidden' : ''}`}>
            <CBSEStateFront
              studentData={studentData} onStudentDataChange={handleStudentDataChange}
              academicSubjects={loadedClassSubjects} 
              faMarks={faMarks} onFaMarksChange={handleFaMarksChange} 
              coMarks={coMarks} onCoMarksChange={handleCoMarksChange} 
              secondLanguage={frontSecondLanguage} onSecondLanguageChange={(val) => { if(!isFieldDisabledForRole()) setFrontSecondLanguage(val)}}
              academicYear={frontAcademicYear} onAcademicYearChange={(val) => {if(!isFieldDisabledForRole()) setFrontAcademicYear(val)}}
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
      {!isLoadingStudentAndClassData && !loadedStudent && admissionIdInput && (
          <Card className="no-print border-destructive">
            <CardHeader className="flex-row items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive"/>
                <CardTitle className="text-destructive">Student Data Not Loaded</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Student data could not be loaded for Admission ID: <span className="font-semibold">{admissionIdInput}</span>.</p>
                <p className="mt-1">Please ensure the Admission ID is correct and the student is properly configured in the system (assigned to a class, etc.).</p>
            </CardContent>
          </Card>
      )}
       {!isLoadingStudentAndClassData && !admissionIdInput && (
          <Card className="no-print">
            <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Enter an Admission ID and Academic Year, then click "Load Student Data" to begin.</p>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
    
    
