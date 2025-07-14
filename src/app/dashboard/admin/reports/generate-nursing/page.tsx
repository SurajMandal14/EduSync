
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/user";
import { FileText, Loader2, User, School as SchoolIconUI, Search as SearchIcon, Printer } from 'lucide-react';
import { getStudentDetailsForReportCard } from '@/app/actions/schoolUsers';
import { getSchoolById } from '@/app/actions/schools';
import type { School } from '@/types/school';
import type { MarkEntry as MarkEntryType } from '@/types/marks';
import type { SchoolClass } from '@/types/classes';
import { getClassDetailsById } from '@/app/actions/classes';
import { getStudentMarksForReportCard } from '@/app/actions/marks';
import NursingCollege, { type NursingStudentInfo, type NursingMarksEntry } from '@/components/report-cards/NursingCollege';

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

export default function GenerateNursingReportPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [studentClass, setStudentClass] = useState<SchoolClass | null>(null);
  const [admissionIdInput, setAdmissionIdInput] = useState<string>("");
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [isLoading, setIsLoading] = useState(false);
  
  const [studentInfo, setStudentInfo] = useState<NursingStudentInfo>({});
  const [marks, setMarks] = useState<NursingMarksEntry[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setAuthUser(parsedUser);
      if (parsedUser.schoolId) {
        getSchoolById(parsedUser.schoolId).then(res => {
          if (res.success && res.school) setSchool(res.school);
        });
      }
    }
  }, []);

  const handleLoadStudent = async () => {
    if (!authUser?.schoolId || !admissionIdInput) {
      toast({ variant: 'destructive', title: "Missing Info", description: "School ID or Admission ID missing." });
      return;
    }
    setIsLoading(true);
    const studentRes = await getStudentDetailsForReportCard(admissionIdInput, authUser.schoolId);
    if (!studentRes.success || !studentRes.student) {
      toast({ variant: 'destructive', title: "Error", description: studentRes.message || "Could not load student" });
      setIsLoading(false);
      return;
    }
    const studentData = studentRes.student;
    setStudent(studentData);
    
    let studentClassDetails: SchoolClass | null = null;
    if (studentData.classId) {
      const classRes = await getClassDetailsById(studentData.classId, authUser.schoolId);
      if (classRes.success && classRes.classDetails) {
        studentClassDetails = classRes.classDetails;
        setStudentClass(classRes.classDetails);
      }
    }
    
    setStudentInfo({
      regNo: school?.regNo || "70044/066/067", // Example data
      email: school?.email || "mirchaiyanursingcampussiraha@gmail.com", // Example data
      schoolName: school?.schoolName || "Mirchaiya Health Nursing Campus Pvt.Ltd",
      schoolAddress: "Mirchaiya-07, Siraha", // Example data
      symbolNo: studentData.examNo,
      rollNo: studentData.rollNo,
      studentName: studentData.name,
      fatherName: studentData.fatherName,
      program: studentClassDetails?.name, 
      year: "Third" // This needs to be dynamic
    });

    const marksRes = await getStudentMarksForReportCard(studentData._id, authUser.schoolId, academicYear, studentData.classId!);
    if (marksRes.success && marksRes.marks) {
      const formattedMarks = (studentClassDetails?.subjects || []).map(subject => {
        const mark = marksRes.marks?.find(m => m.subjectName === subject.name && m.assessmentName.includes('Terminal'));
        return {
          subject: subject.name,
          totalMarks: mark?.maxMarks || 80,
          passingMarks: (mark?.maxMarks || 80) * 0.4,
          obtainMarks: mark?.marksObtained || 0
        };
      });
      setMarks(formattedMarks);
    }

    setIsLoading(false);
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
          <CardDescription>Enter student admission ID to generate their report card.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="w-full sm:w-auto">
            <Label htmlFor="admissionIdInput" className="mb-1 flex items-center"><User className="mr-2 h-4 w-4"/>Admission ID</Label>
            <Input id="admissionIdInput" placeholder="Enter Admission ID" value={admissionIdInput} onChange={e => setAdmissionIdInput(e.target.value)} disabled={isLoading}/>
          </div>
          <div className="w-full sm:w-auto">
            <Label htmlFor="academicYearInput" className="mb-1">Academic Year</Label>
            <Input id="academicYearInput" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="YYYY-YYYY" disabled={isLoading}/>
          </div>
          <Button onClick={handleLoadStudent} disabled={isLoading || !admissionIdInput}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SearchIcon className="mr-2 h-4 w-4"/>} Load Data
          </Button>
          <Button onClick={handlePrint} disabled={!student}><Printer className="mr-2 h-4 w-4"/>Print</Button>
        </CardContent>
      </Card>
      
      {student && (
        <div className="printable-report-card bg-white p-4 rounded-lg shadow-md">
            <NursingCollege studentInfo={studentInfo} marks={marks} />
        </div>
      )}
    </div>
  )
}
