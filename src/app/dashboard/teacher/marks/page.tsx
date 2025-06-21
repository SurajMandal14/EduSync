
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { BookCopy, Loader2, Save, Info, Filter } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser, User as AppUser } from "@/types/user";
import type { StudentMarkInput, MarksSubmissionPayload } from "@/types/marks";
import { getSubjectsForTeacher, submitMarks, getMarksForAssessment, type SubjectForTeacher } from "@/app/actions/marks";
import { getStudentsByClass } from "@/app/actions/schoolUsers";

const ASSESSMENT_TYPES = ["FA1", "FA2", "FA3", "FA4", "SA1", "SA2"];
const FA_ASSESSMENTS = ["FA1", "FA2", "FA3", "FA4"];
const SA_ASSESSMENTS = ["SA1", "SA2"];


const FA_TOOLS = [
  { key: 'tool1', label: 'Tool 1', maxMarks: 10 },
  { key: 'tool2', label: 'Tool 2', maxMarks: 10 },
  { key: 'tool3', label: 'Tool 3', maxMarks: 10 },
  { key: 'tool4', label: 'Tool 4', maxMarks: 20 },
] as const;
type FaToolKey = (typeof FA_TOOLS)[number]['key'];

interface StudentMarksFAState {
  tool1: number | null;
  maxTool1: number;
  tool2: number | null;
  maxTool2: number;
  tool3: number | null;
  maxTool3: number;
  tool4: number | null;
  maxTool4: number;
}

interface StudentMarksSAState {
  p1Marks: number | null;
  p1Max: number | null;
  p2Marks: number | null;
  p2Max: number | null;
}

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

export default function TeacherMarksEntryPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const [availableSubjects, setAvailableSubjects] = useState<SubjectForTeacher[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectForTeacher | null>(null);

  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());

  const [studentsForMarks, setStudentsForMarks] = useState<AppUser[]>([]);
  const [studentMarks, setStudentMarks] = useState<Record<string, StudentMarksFAState | StudentMarksSAState>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({}); // For checkboxes

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingStudentsAndMarks, setIsLoadingStudentsAndMarks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultMaxMarksSApaper, setDefaultMaxMarksSApaper] = useState<number>(80);

  const isCurrentAssessmentFA = FA_ASSESSMENTS.includes(selectedAssessment);
  const isCurrentAssessmentSA = SA_ASSESSMENTS.includes(selectedAssessment);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'teacher' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          if(parsedUser?.role !== 'teacher') toast({ variant: "destructive", title: "Access Denied" });
        }
      } catch (e) { setAuthUser(null); }
    } else { setAuthUser(null); }
  }, [toast]);

  const fetchSubjects = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoadingSubjects(false);
      return;
    }
    setIsLoadingSubjects(true);
    const subjectsResult = await getSubjectsForTeacher(authUser._id.toString(), authUser.schoolId.toString());
    if (subjectsResult.length > 0) {
      setAvailableSubjects(subjectsResult);
    } else {
      toast({ variant: "info", title: "No Subjects", description: "No subjects assigned to you for marks entry." });
      setAvailableSubjects([]);
    }
    setIsLoadingSubjects(false);
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser) fetchSubjects();
  }, [authUser, fetchSubjects]);

  const fetchStudentsAndMarks = useCallback(async () => {
    if (!selectedSubject || !selectedSubject.classId || !selectedAssessment || !selectedAcademicYear || !authUser?.schoolId) {
      setStudentsForMarks([]);
      setStudentMarks({});
      setSelectedStudentIds({});
      setIsLoadingStudentsAndMarks(false);
      return;
    }
    setIsLoadingStudentsAndMarks(true);
    try {
      const studentsResult = await getStudentsByClass(authUser.schoolId.toString(), selectedSubject.classId);
      if (studentsResult.success && studentsResult.users) {
        setStudentsForMarks(studentsResult.users);
        
        const initialSelections: Record<string, boolean> = {};
        studentsResult.users.forEach(student => {
            initialSelections[student._id!.toString()] = true; // Pre-select all
        });
        setSelectedStudentIds(initialSelections);

        const marksResult = await getMarksForAssessment(
          authUser.schoolId.toString(),
          selectedSubject.classId,
          selectedSubject.subjectName,
          selectedAssessment,
          selectedAcademicYear
        );

        const initialMarks: Record<string, StudentMarksFAState | StudentMarksSAState> = {};

        if (isCurrentAssessmentFA) {
            studentsResult.users.forEach(student => {
                const studentIdStr = student._id!.toString();
                initialMarks[studentIdStr] = {
                    tool1: null, maxTool1: 10,
                    tool2: null, maxTool2: 10,
                    tool3: null, maxTool3: 10,
                    tool4: null, maxTool4: 20,
                };
            });
            if (marksResult.success && marksResult.marks) {
                 marksResult.marks.forEach(mark => {
                    const studentIdStr = mark.studentId.toString();
                    const assessmentNameParts = mark.assessmentName.split('-');
                    if (assessmentNameParts.length === 2) {
                        const faBaseName = assessmentNameParts[0];
                        const toolKeyRaw = assessmentNameParts[1];
                        const toolKey = toolKeyRaw.toLowerCase().replace('tool', 'tool') as FaToolKey;

                        if (faBaseName === selectedAssessment && initialMarks[studentIdStr] && toolKey in initialMarks[studentIdStr]!) {
                           (initialMarks[studentIdStr] as StudentMarksFAState)[toolKey] = mark.marksObtained;
                           (initialMarks[studentIdStr] as StudentMarksFAState)[`max${toolKey.charAt(0).toUpperCase() + toolKey.slice(1)}` as keyof StudentMarksFAState] = mark.maxMarks;
                        }
                    }
                });
            }
        } else if (isCurrentAssessmentSA) {
            studentsResult.users.forEach(student => {
                initialMarks[student._id!.toString()] = {
                    p1Marks: null, p1Max: defaultMaxMarksSApaper,
                    p2Marks: null, p2Max: defaultMaxMarksSApaper,
                };
            });
            if (marksResult.success && marksResult.marks) {
                marksResult.marks.forEach(mark => {
                    const studentIdStr = mark.studentId.toString();
                    if (mark.assessmentName === `${selectedAssessment}-Paper1`) {
                        (initialMarks[studentIdStr] as StudentMarksSAState).p1Marks = mark.marksObtained;
                        (initialMarks[studentIdStr] as StudentMarksSAState).p1Max = mark.maxMarks;
                    } else if (mark.assessmentName === `${selectedAssessment}-Paper2`) {
                        (initialMarks[studentIdStr] as StudentMarksSAState).p2Marks = mark.marksObtained;
                        (initialMarks[studentIdStr] as StudentMarksSAState).p2Max = mark.maxMarks;
                    }
                });
                if (marksResult.marks.find(m => m.assessmentName === `${selectedAssessment}-Paper1`)) {
                    setDefaultMaxMarksSApaper(marksResult.marks.find(m => m.assessmentName === `${selectedAssessment}-Paper1`)!.maxMarks);
                } else if (marksResult.marks.find(m => m.assessmentName === `${selectedAssessment}-Paper2`)) {
                     setDefaultMaxMarksSApaper(marksResult.marks.find(m => m.assessmentName === `${selectedAssessment}-Paper2`)!.maxMarks);
                }
            }
        }
        setStudentMarks(initialMarks);

      } else {
        toast({ variant: "destructive", title: "Error", description: studentsResult.message || "Failed to load students."});
        setStudentsForMarks([]);
        setStudentMarks({});
        setSelectedStudentIds({});
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred fetching students or marks."});
      console.error("Error in fetchStudentsAndMarks:", error);
      setStudentsForMarks([]);
      setStudentMarks({});
      setSelectedStudentIds({});
    } finally {
      setIsLoadingStudentsAndMarks(false);
    }
  }, [authUser, selectedSubject, selectedAssessment, selectedAcademicYear, toast, isCurrentAssessmentFA, isCurrentAssessmentSA, defaultMaxMarksSApaper]);

  useEffect(() => {
    if (selectedSubject && selectedSubject.classId && selectedAssessment && selectedAcademicYear) {
      fetchStudentsAndMarks();
    } else {
      setStudentsForMarks([]);
      setStudentMarks({});
      setSelectedStudentIds({});
    }
  }, [selectedSubject, selectedAssessment, selectedAcademicYear, fetchStudentsAndMarks]);


  const handleSubjectChange = (value: string) => {
    const subjectInfo = availableSubjects.find(s => s.value === value);
    setSelectedSubject(subjectInfo || null);
    setSelectedAssessment("");
    setStudentsForMarks([]);
    setStudentMarks({});
    setSelectedStudentIds({});
  };

  const handleMarksChange = (studentId: string, fieldOrToolKey: FaToolKey | 'p1Marks' | 'p1Max' | 'p2Marks' | 'p2Max', value: string) => {
    const numValue = parseInt(value, 10);
    const validatedValue = isNaN(numValue) ? null : numValue;

    setStudentMarks(prev => {
      const currentStudentMarks = { ...(prev[studentId] || {}) };
      if (isCurrentAssessmentFA) {
        const faMarks = currentStudentMarks as StudentMarksFAState;
        const toolKey = fieldOrToolKey as FaToolKey;
        faMarks[toolKey] = validatedValue; 
      } else if (isCurrentAssessmentSA) {
        const saMarks = currentStudentMarks as StudentMarksSAState;
        saMarks[fieldOrToolKey as keyof StudentMarksSAState] = validatedValue;
      }
      return { ...prev, [studentId]: currentStudentMarks };
    });
  };

  const handleDefaultMaxMarksSApaperChange = (value: string) => {
    const newMax = parseInt(value, 10);
    if (!isNaN(newMax) && newMax > 0) {
      setDefaultMaxMarksSApaper(newMax);
      if (isCurrentAssessmentSA) {
        setStudentMarks(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(studentId => {
             const current = updated[studentId] as StudentMarksSAState;
             if (current.p1Max === defaultMaxMarksSApaper || current.p1Max === undefined || current.p1Max === null) {
                current.p1Max = newMax;
             }
             if (current.p2Max === defaultMaxMarksSApaper || current.p2Max === undefined || current.p2Max === null) {
                current.p2Max = newMax;
             }
          });
          return updated;
        });
      }
    } else if (value === "") {
        setDefaultMaxMarksSApaper(80);
    }
  };

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return; 
    const newSelections: Record<string, boolean> = {};
    studentsForMarks.forEach(student => {
        newSelections[student._id!.toString()] = checked as boolean;
    });
    setSelectedStudentIds(newSelections);
  };

  const handleStudentSelectionChange = (studentId: string, checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    setSelectedStudentIds(prev => ({
        ...prev,
        [studentId]: checked as boolean,
    }));
  };
  
  const allStudentsSelected = studentsForMarks.length > 0 && studentsForMarks.every(s => selectedStudentIds[s._id!.toString()]);
  const someStudentsSelected = studentsForMarks.some(s => selectedStudentIds[s._id!.toString()]);
  const selectAllCheckboxState = allStudentsSelected ? true : (someStudentsSelected ? 'indeterminate' : false);


  const handleSubmit = async () => {
    if (!authUser || !authUser._id || !authUser.schoolId || !selectedSubject || !selectedAssessment || !selectedAcademicYear || studentsForMarks.length === 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select all fields and ensure students are loaded." });
      return;
    }
    
    const finalSelectedStudentIds = Object.entries(selectedStudentIds)
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => id);

    if (finalSelectedStudentIds.length === 0) {
        toast({ variant: "info", title: "No Students Selected", description: "Please select students to submit marks for." });
        return;
    }
    
    setIsSubmitting(true);

    const marksToSubmit: StudentMarkInput[] = [];
    const studentsToProcess = studentsForMarks.filter(student => finalSelectedStudentIds.includes(student._id!.toString()));


    for (const student of studentsToProcess) {
      const studentIdStr = student._id!.toString();
      const currentStudentMarkState = studentMarks[studentIdStr];

      if (!currentStudentMarkState) continue;

      if (isCurrentAssessmentFA) {
        const faData = currentStudentMarkState as StudentMarksFAState;
        for (const tool of FA_TOOLS) {
          const marksObtained = faData[tool.key];
          const maxMarks = faData[`max${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}` as keyof StudentMarksFAState] as number;

          if (typeof marksObtained !== 'number' || marksObtained < 0) {
            toast({ variant: "destructive", title: "Invalid Marks", description: `Marks for ${student.name} (${tool.label}) cannot be negative or empty.`});
            setIsSubmitting(false); return;
          }
          if (maxMarks <= 0) {
            toast({ variant: "destructive", title: "Invalid Max Marks", description: `Max marks for ${student.name} (${tool.label}) must be positive.`});
            setIsSubmitting(false); return;
          }
          if (marksObtained > maxMarks) {
            toast({ variant: "destructive", title: "Marks Exceed Max", description: `Marks for ${student.name} (${tool.label}: ${marksObtained}) exceed max marks (${maxMarks}).`});
            setIsSubmitting(false); return;
          }
          marksToSubmit.push({
            studentId: studentIdStr,
            studentName: student.name || "N/A",
            marksObtained: marksObtained,
            maxMarks: maxMarks,
            assessmentName: `${selectedAssessment}-${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}`,
          });
        }
      } else if (isCurrentAssessmentSA) {
        const saData = currentStudentMarkState as StudentMarksSAState;
        if (typeof saData.p1Marks === 'number' && saData.p1Marks >= 0 && typeof saData.p1Max === 'number' && saData.p1Max > 0) {
            if (saData.p1Marks > saData.p1Max) {
                toast({ variant: "destructive", title: "Marks Exceed Max", description: `Paper 1 marks for ${student.name} (${saData.p1Marks}) exceed max marks (${saData.p1Max}).`});
                setIsSubmitting(false); return;
            }
            marksToSubmit.push({
                studentId: studentIdStr, studentName: student.name || "N/A",
                marksObtained: saData.p1Marks, maxMarks: saData.p1Max,
                assessmentName: `${selectedAssessment}-Paper1`,
            });
        } else if (saData.p1Marks !== null && saData.p1Marks !== undefined) { 
            toast({ variant: "destructive", title: "Invalid Marks", description: `Paper 1 marks or max marks for ${student.name} are invalid.`});
            setIsSubmitting(false); return;
        }
        if (typeof saData.p2Marks === 'number' && saData.p2Marks >= 0 && typeof saData.p2Max === 'number' && saData.p2Max > 0) {
             if (saData.p2Marks > saData.p2Max) {
                toast({ variant: "destructive", title: "Marks Exceed Max", description: `Paper 2 marks for ${student.name} (${saData.p2Marks}) exceed max marks (${saData.p2Max}).`});
                setIsSubmitting(false); return;
            }
            marksToSubmit.push({
                studentId: studentIdStr, studentName: student.name || "N/A",
                marksObtained: saData.p2Marks, maxMarks: saData.p2Max,
                assessmentName: `${selectedAssessment}-Paper2`,
            });
        } else if (saData.p2Marks !== null && saData.p2Marks !== undefined) { 
             toast({ variant: "destructive", title: "Invalid Marks", description: `Paper 2 marks or max marks for ${student.name} are invalid.`});
            setIsSubmitting(false); return;
        }
      }
    }

    if (marksToSubmit.length === 0 && studentsToProcess.length > 0) {
        toast({ variant: "info", title: "No Valid Marks to Submit", description: "No marks were entered for selected students or all entries are invalid." });
        setIsSubmitting(false);
        return;
    }
     if (marksToSubmit.length === 0 && studentsToProcess.length === 0) { // Should be caught by finalSelectedStudentIds check earlier
        toast({ variant: "info", title: "No Students", description: "No students selected to submit marks for." });
        setIsSubmitting(false);
        return;
    }

    const payload: MarksSubmissionPayload = {
      classId: selectedSubject.classId,
      className: selectedSubject.className,
      subjectId: selectedSubject.subjectName,
      subjectName: selectedSubject.subjectName,
      academicYear: selectedAcademicYear,
      markedByTeacherId: authUser._id.toString(),
      schoolId: authUser.schoolId.toString(),
      studentMarks: marksToSubmit,
    };

    const result = await submitMarks(payload);
    if (result.success) {
      toast({ title: "Marks Submitted", description: result.message });
      fetchStudentsAndMarks(); // Refresh marks
    } else {
      toast({ variant: "destructive", title: "Submission Failed", description: result.error || result.message });
    }
    setIsSubmitting(false);
  };


  if (!authUser) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>Please log in as a teacher to enter marks.</p></CardContent>
      </Card>
    );
  }

  const canLoadStudents = !!(selectedSubject && selectedSubject.classId && selectedAssessment && selectedAcademicYear);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookCopy className="mr-2 h-6 w-6" /> Enter Student Marks
          </CardTitle>
          <CardDescription>
            Select the subject, assessment, and academic year to enter marks for students.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selection Criteria</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="subject-select">Subject (Class)</Label>
            <Select onValueChange={handleSubjectChange} value={selectedSubject?.value || ""} disabled={isLoadingSubjects || availableSubjects.length === 0}>
              <SelectTrigger id="subject-select">
                <SelectValue placeholder={isLoadingSubjects ? "Loading subjects..." : (availableSubjects.length === 0 ? "No subjects assigned" : "Select subject")} />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map(subject => (
                  <SelectItem key={subject.value} value={subject.value}>{subject.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="assessment-select">Assessment</Label>
            <Select onValueChange={setSelectedAssessment} value={selectedAssessment} disabled={!selectedSubject}>
              <SelectTrigger id="assessment-select"><SelectValue placeholder="Select assessment" /></SelectTrigger>
              <SelectContent>
                {ASSESSMENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="academic-year-input">Academic Year</Label>
            <Input
                id="academic-year-input"
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                placeholder="e.g., 2023-2024"
                disabled={!selectedSubject}
            />
          </div>
           <div className="md:col-start-3">
            <Button
              onClick={fetchStudentsAndMarks}
              disabled={isLoadingStudentsAndMarks || !canLoadStudents}
              className="w-full"
            >
              {isLoadingStudentsAndMarks ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Filter className="mr-2 h-4 w-4"/>}
              Load Students & Marks
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedSubject && selectedAssessment && selectedAcademicYear && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Marks for: {selectedSubject.label} - {selectedAssessment} ({selectedAcademicYear})</CardTitle>
            {isCurrentAssessmentSA && (
             <div className="mt-2">
                <Label htmlFor="default-max-marks-sa">Default Max Marks per SA Paper</Label>
                <Input
                    id="default-max-marks-sa"
                    type="number"
                    className="w-32"
                    value={defaultMaxMarksSApaper}
                    onChange={(e) => handleDefaultMaxMarksSApaperChange(e.target.value)}
                    disabled={isSubmitting || isLoadingStudentsAndMarks}
                />
                 <p className="text-xs text-muted-foreground mt-1">Set this for SA papers if different from individual entries.</p>
            </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingStudentsAndMarks ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>
            ) : studentsForMarks.length > 0 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                            checked={selectAllCheckboxState} 
                            onCheckedChange={handleSelectAllChange}
                            aria-label="Select all students"
                        />
                      </TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission ID</TableHead>
                      {isCurrentAssessmentFA ? (
                        FA_TOOLS.map(tool => <TableHead key={tool.key} className="w-28 text-center">{tool.label} ({tool.maxMarks}M)</TableHead>)
                      ) : isCurrentAssessmentSA ? (
                        <>
                          <TableHead className="w-36 text-center">P1 Marks</TableHead>
                          <TableHead className="w-32 text-center">P1 Max</TableHead>
                          <TableHead className="w-36 text-center">P2 Marks</TableHead>
                          <TableHead className="w-32 text-center">P2 Max</TableHead>
                        </>
                      ) : null }
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForMarks.map(student => {
                      const studentIdStr = student._id!.toString();
                      const currentMarksState = studentMarks[studentIdStr];
                      return (
                        <TableRow key={studentIdStr}>
                          <TableCell>
                            <Checkbox 
                                checked={!!selectedStudentIds[studentIdStr]}
                                onCheckedChange={(checked) => handleStudentSelectionChange(studentIdStr, checked)}
                                aria-label={`Select ${student.name}`}
                            />
                          </TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.admissionId || 'N/A'}</TableCell>
                          {isCurrentAssessmentFA && currentMarksState && (
                            FA_TOOLS.map(tool => {
                              const faData = currentMarksState as StudentMarksFAState;
                              const toolValue = faData ? faData[tool.key] : null;
                              const toolMax = faData ? faData[`max${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}` as keyof StudentMarksFAState] : tool.maxMarks;

                              return (
                                <TableCell key={tool.key} className="text-center">
                                  <Input
                                    type="number"
                                    value={toolValue ?? ""}
                                    onChange={e => handleMarksChange(studentIdStr, tool.key, e.target.value)}
                                    disabled={isSubmitting}
                                    max={toolMax as number}
                                    min="0"
                                    className="mx-auto"
                                  />
                                </TableCell>
                              );
                            })
                          )}
                          {isCurrentAssessmentSA && currentMarksState && (
                            <>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  value={(currentMarksState as StudentMarksSAState)?.p1Marks ?? ""}
                                  onChange={e => handleMarksChange(studentIdStr, 'p1Marks', e.target.value)}
                                  disabled={isSubmitting}
                                  max={(currentMarksState as StudentMarksSAState)?.p1Max ?? defaultMaxMarksSApaper}
                                  min="0"
                                  className="mx-auto"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  value={(currentMarksState as StudentMarksSAState)?.p1Max ?? defaultMaxMarksSApaper}
                                  onChange={e => handleMarksChange(studentIdStr, 'p1Max', e.target.value)}
                                  disabled={isSubmitting}
                                  min="1"
                                  className="mx-auto"
                                />
                              </TableCell>
                               <TableCell className="text-center">
                                <Input
                                  type="number"
                                  value={(currentMarksState as StudentMarksSAState)?.p2Marks ?? ""}
                                  onChange={e => handleMarksChange(studentIdStr, 'p2Marks', e.target.value)}
                                  disabled={isSubmitting}
                                  max={(currentMarksState as StudentMarksSAState)?.p2Max ?? defaultMaxMarksSApaper}
                                  min="0"
                                  className="mx-auto"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  value={(currentMarksState as StudentMarksSAState)?.p2Max ?? defaultMaxMarksSApaper}
                                  onChange={e => handleMarksChange(studentIdStr, 'p2Max', e.target.value)}
                                  disabled={isSubmitting}
                                  min="1"
                                  className="mx-auto"
                                />
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={isSubmitting || isLoadingStudentsAndMarks || studentsForMarks.length === 0}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Submit Marks
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {selectedSubject ? `No students found for class ${selectedSubject.className}.` : "Select criteria to load students."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

