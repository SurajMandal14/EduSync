
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/user";
import { FileText, Loader2, User, School as SchoolIconUI, Search as SearchIcon, Printer, Save, UploadCloud, XOctagon } from 'lucide-react';
import { getStudentDetailsForReportCard } from '@/app/actions/schoolUsers';
import { getSchoolById } from '@/app/actions/schools';
import type { School } from '@/types/school';
import type { SchoolClass } from '@/types/classes';
import { getClassDetailsById } from '@/app/actions/classes';
import { getStudentMarksForReportCard, getAvailableTermsForStudent } from '@/app/actions/marks';
import NursingCollegeReportCard, { type NursingStudentInfo as ReportStudentInfo, type NursingMarksInfo } from '@/components/report-cards/NursingCollegeReportCard';
import { saveReportCard, setReportCardPublicationStatus } from '@/app/actions/reports';
import type { ReportCardData } from '@/types/report';


const TERMINAL_EXAMS = {
    "Term 1": "1st Terminal Examination",
    "Term 2": "2nd Terminal Examination",
    "Term 3": "3rd Terminal Examination",
    "Final Exam": "Final Examination"
};

export default function GenerateNursingReportPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [studentClass, setStudentClass] = useState<SchoolClass | null>(null);
  const [registrationNoInput, setRegistrationNoInput] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("Term 2");
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadedReportId, setLoadedReportId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState<boolean | null>(null);
  
  const [studentInfo, setStudentInfo] = useState<ReportStudentInfo>({});
  const [marks, setMarks] = useState<NursingMarksInfo[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setAuthUser(parsedUser);
        if (parsedUser?.schoolId) {
          getSchoolById(parsedUser.schoolId).then(res => {
            if (res.success && res.school) setSchool(res.school);
          });
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
      }
    }
  }, []);

  const handleLoadStudent = async () => {
    if (!authUser?.schoolId || !registrationNoInput) {
      toast({ variant: 'destructive', title: "Missing Info", description: "School ID or Registration No. missing." });
      return;
    }
    setIsLoading(true);
    setStudent(null);
    setStudentClass(null);
    setStudentInfo({});
    setMarks([]);
    setAvailableTerms([]);
    setSelectedTerm("");
    setLoadedReportId(null);
    setIsPublished(null);

    const studentRes = await getStudentDetailsForReportCard(registrationNoInput, authUser.schoolId);
    if (!studentRes.success || !studentRes.student) {
      toast({ variant: 'destructive', title: "Error", description: studentRes.message || "Could not load student" });
      setIsLoading(false);
      return;
    }
    const studentData = studentRes.student;
    setStudent(studentData);

    const termsRes = await getAvailableTermsForStudent(studentData._id, authUser.schoolId);
    if (termsRes.success && termsRes.data) {
        setAvailableTerms(termsRes.data.length > 0 ? termsRes.data : Object.keys(TERMINAL_EXAMS));
        if (termsRes.data.length > 0) {
            setSelectedTerm(termsRes.data[0]);
        } else {
            setSelectedTerm(Object.keys(TERMINAL_EXAMS)[0]);
        }
    } else {
        setAvailableTerms(Object.keys(TERMINAL_EXAMS));
        setSelectedTerm(Object.keys(TERMINAL_EXAMS)[0]);
    }
    
    let studentClassDetails: SchoolClass | null = null;
    if (studentData.classId) {
      const classRes = await getClassDetailsById(studentData.classId, authUser.schoolId);
      if (classRes.success && classRes.classDetails) {
        studentClassDetails = classRes.classDetails;
        setStudentClass(classRes.classDetails);
      }
    }
    setIsLoading(false);
  };
  
  const loadDataForTerm = useCallback(async () => {
     if (!student || !selectedTerm || !authUser?.schoolId || !student.classId) return;
     
     setIsLoading(true);
     setMarks([]);
     setLoadedReportId(null);
     setIsPublished(null);

     const classRes = await getClassDetailsById(student.classId, authUser.schoolId);
     let studentClassDetails: SchoolClass | null = null;
     if (classRes.success && classRes.classDetails) {
        studentClassDetails = classRes.classDetails;
        setStudentClass(classRes.classDetails);
     }
     
     setStudentInfo({
        regdNo: (school as any)?.regNo || "70044/066/067", 
        email: (school as any)?.email || "mirchaiyanursingcampussiraha@gmail.com",
        schoolName: school?.schoolName || "Mirchaiya Health Nursing Campus Pvt.Ltd",
        address_school: "Mirchaiya-07, Siraha", 
        symbolNo: student.symbolNo,
        studentName: student.name,
        fatherName: student.fatherName,
        program: studentClassDetails?.name, 
        year: "Third", // This needs to be dynamic based on class or student data
        examTitle: TERMINAL_EXAMS[selectedTerm as keyof typeof TERMINAL_EXAMS],
        session: "2080" // This should be dynamic
      });

      const marksRes = await getStudentMarksForReportCard(student._id, authUser.schoolId, student.classId, selectedTerm);
      if (marksRes.success && marksRes.marks) {
        const formattedMarks = (studentClassDetails?.subjects || []).map((subject, index) => {
          const mark = marksRes.marks?.find(m => m.subjectId === subject.name && m.assessmentName === selectedTerm);
          return {
            sn: index + 1,
            subject: subject.name,
            fullMarks: mark?.maxMarks || 80, // Default if not found
            passMarks: (mark?.maxMarks || 80) * 0.4,
            theoryMarks: mark?.marksObtained ?? 0,
            practicalMarks: 0, 
            totalMarks: mark?.marksObtained ?? 0,
            remarks: (mark?.marksObtained ?? 0) >= ((mark?.maxMarks || 80) * 0.4) ? "Pass" : "Fail"
          };
        });
        setMarks(formattedMarks);
      } else {
          setMarks([]);
          toast({variant: "info", title: "No Marks Found", description: `No marks found for ${selectedTerm}.`})
      }
      setIsLoading(false);
  }, [student, selectedTerm, authUser, school, toast]);

  useEffect(() => {
    loadDataForTerm();
  }, [selectedTerm, loadDataForTerm]);


  const handleSave = async () => {
    if (!student || !studentClass || !school || !authUser || !selectedTerm) {
      toast({ variant: "destructive", title: "Error", description: "Missing required data to save report." });
      return;
    }
    setIsSaving(true);
    const payload: Omit<ReportCardData, '_id' | 'createdAt' | 'updatedAt' | 'isPublished'> = {
        studentId: student._id,
        schoolId: school._id,
        reportCardTemplateKey: 'nursing_college',
        studentInfo: {
          ...studentInfo,
          studentIdNo: student._id
        },
        formativeAssessments: [],
        coCurricularAssessments: [],
        summativeAssessments: marks.map(m => ({
            subjectName: m.subject,
            paper: 'I',
            sa1: { marks: m.totalMarks, maxMarks: m.fullMarks },
            sa2: { marks: null, maxMarks: null },
            faTotal200M: null
        })),
        attendance: [],
        finalOverallGrade: parseFloat(((marks.reduce((acc, m) => acc + m.totalMarks, 0) / marks.reduce((acc, m) => acc + m.fullMarks, 0)) * 100).toFixed(2)) >= 40 ? "Pass" : "Fail",
        generatedByAdminId: authUser._id,
        term: selectedTerm,
    };
    const result = await saveReportCard(payload);
    setIsSaving(false);
    if(result.success) {
      toast({ title: "Success", description: "Report card saved successfully." });
      if(result.reportCardId) setLoadedReportId(result.reportCardId);
      if(result.isPublished !== undefined) setIsPublished(result.isPublished);
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error || "Failed to save report card." });
    }
  };

  const handlePublish = async () => {
    if (!loadedReportId || !authUser?.schoolId) {
        toast({ variant: 'destructive', title: "Cannot Publish", description: "Save the report first to get a report ID." });
        return;
    }
    setIsPublishing(true);
    const result = await setReportCardPublicationStatus(loadedReportId, authUser.schoolId, !isPublished);
    if (result.success) {
        toast({ title: "Success", description: result.message });
        setIsPublished(result.isPublished || false);
    } else {
        toast({ variant: 'destructive', title: "Error", description: result.error || "Failed to update publication status." });
    }
    setIsPublishing(false);
  };
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .printable-report-card, .printable-report-card * { visibility: visible !important; }
          .printable-report-card { 
            position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; 
            margin: 0 !important; padding: 0 !important; transform: scale(1); transform-origin: top left;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center"><FileText className="mr-2 h-6 w-6"/>Generate Nursing Report Card</CardTitle>
          <CardDescription>Enter student registration ID to generate their report card.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="w-full sm:w-auto">
              <Label htmlFor="registrationNoInput" className="mb-1 flex items-center"><User className="mr-2 h-4 w-4"/>Registration No.</Label>
              <Input id="registrationNoInput" placeholder="Enter Registration No." value={registrationNoInput} onChange={e => setRegistrationNoInput(e.target.value)} disabled={isLoading || isSaving}/>
            </div>
            <Button onClick={handleLoadStudent} disabled={isLoading || isSaving || !registrationNoInput}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchIcon className="mr-2 h-4 w-4"/>} Load Student
            </Button>
          </div>
          {student && (
             <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="w-full sm:w-auto">
                    <Label htmlFor="terminalSelect" className="mb-1">Terminal Exam</Label>
                    <Select onValueChange={setSelectedTerm} value={selectedTerm} disabled={isLoading || isSaving}>
                        <SelectTrigger id="terminalSelect" className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Select Terminal Exam" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTerms.map((key) => (
                                <SelectItem key={key} value={key}>{TERMINAL_EXAMS[key as keyof typeof TERMINAL_EXAMS] || key}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          )}

          {student && loadedReportId && (
            <p className="text-sm font-medium">
                Current Status: <span className={isPublished ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{isPublished ? "Published" : "Not Published"}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={!student || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Save Report
            </Button>
             <Button onClick={handlePublish} disabled={!loadedReportId || isPublishing}>
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isPublished ? <XOctagon className="mr-2 h-4 w-4"/> : <UploadCloud className="mr-2 h-4 w-4"/>)}
                {isPublishing ? 'Updating...' : (isPublished ? 'Unpublish' : 'Publish')}
            </Button>
            <Button onClick={handlePrint} disabled={!student} variant="outline">
              <Printer className="mr-2 h-4 w-4"/>Print
            </Button>
          </div>

        </CardContent>
      </Card>
      
      {isLoading && (
          <div className="flex justify-center items-center p-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      )}

      {!isLoading && student && (
        <div className="printable-report-card bg-white p-4 rounded-lg shadow-md">
            <NursingCollegeReportCard studentInfo={studentInfo} marks={marks} />
        </div>
      )}
    </div>
  );
}
