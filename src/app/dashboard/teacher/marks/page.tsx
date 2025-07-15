
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { BookCopy, Loader2, Save, Info, Filter } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser, User as AppUser } from "@/types/user";
import type { StudentMarkInput, MarksSubmissionPayload } from "@/types/marks";
import { getSubjectsForTeacher, submitMarks, getMarksForAssessment, type SubjectForTeacher } from "@/app/actions/marks";
import { getStudentsByClass } from "@/app/actions/schoolUsers";
import { getSchoolById } from "@/app/actions/schools";
import type { School, ReportCardTemplateKey } from "@/types/school";

const CBSE_ASSESSMENT_TYPES = ["FA1", "FA2", "FA3", "FA4", "SA1", "SA2"];
const NURSING_ASSESSMENT_TYPES = ["Term 1", "Term 2", "Term 3", "Final Exam"];

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

interface StudentMarksNursingState {
    marksObtained: number | null;
    maxMarks: number;
}

type StudentMarksState = StudentMarksFAState | StudentMarksSAState | StudentMarksNursingState;

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
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [reportCardTemplate, setReportCardTemplate] = useState<ReportCardTemplateKey | null>(null);

  const [availableSubjects, setAvailableSubjects] = useState<SubjectForTeacher[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectForTeacher | null>(null);

  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentAcademicYear());

  const [studentsForMarks, setStudentsForMarks] = useState<AppUser[]>([]);
  const [studentMarks, setStudentMarks] = useState<Record<string, StudentMarksState>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});

  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingStudentsAndMarks, setIsLoadingStudentsAndMarks] = useState(false);
  const [isLoadingSchoolDetails, setIsLoadingSchoolDetails] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [defaultMaxMarks, setDefaultMaxMarks] = useState<number>(80);

  const isCBSETemplate = reportCardTemplate === 'cbse_state';
  const isNursingTemplate = reportCardTemplate === 'nursing_college';
  
  const isCurrentAssessmentFA = isCBSETemplate && CBSE_ASSESSMENT_TYPES.slice(0, 4).includes(selectedAssessment);
  const isCurrentAssessmentSA = isCBSETemplate && CBSE_ASSESSMENT_TYPES.slice(4, 6).includes(selectedAssessment);

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

  const fetchInitialData = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoadingSubjects(false);
      setIsLoadingSchoolDetails(false);
      return;
    }
    setIsLoadingSubjects(true);
    setIsLoadingSchoolDetails(true);

    const [subjectsResult, schoolResult] = await Promise.all([
      getSubjectsForTeacher(authUser._id.toString(), authUser.schoolId.toString()),
      getSchoolById(authUser.schoolId.toString())
    ]);

    if (subjectsResult.length > 0) {
      setAvailableSubjects(subjectsResult);
    } else {
      toast({ variant: "info", title: "No Subjects", description: "No subjects assigned to you for marks entry." });
      setAvailableSubjects([]);
    }
    setIsLoadingSubjects(false);

    if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
        setReportCardTemplate(schoolResult.school.reportCardTemplate || 'none');
    } else {
        toast({variant: "destructive", title: "School Details Error", description: "Could not load school configuration."})
        setSchoolDetails(null);
        setReportCardTemplate(null);
    }
    setIsLoadingSchoolDetails(false);

  }, [authUser, toast]);

  useEffect(() => {
    if (authUser) fetchInitialData();
  }, [authUser, fetchInitialData]);

  const fetchStudentsAndMarks = useCallback(async () => {
    if (!selectedSubject || !selectedSubject.classId || !selectedAssessment || !selectedAcademicYear || !authUser?.schoolId) {
      setStudentsForMarks([]); setStudentMarks({}); setSelectedStudentIds({});
      setIsLoadingStudentsAndMarks(false);
      return;
    }
    setIsLoadingStudentsAndMarks(true);
    try {
      const studentsResult = await getStudentsByClass(authUser.schoolId.toString(), selectedSubject.classId);
      if (studentsResult.success && studentsResult.users) {
        const currentStudents = studentsResult.users;
        setStudentsForMarks(currentStudents);
        
        const initialSelections: Record<string, boolean> = {};
        currentStudents.forEach(student => { initialSelections[student._id!.toString()] = true; });
        setSelectedStudentIds(initialSelections);

        const marksResult = await getMarksForAssessment(
          authUser.schoolId.toString(), selectedSubject.classId,
          selectedSubject.subjectName, selectedAssessment, selectedAcademicYear
        );

        const initialMarks: Record<string, StudentMarksState> = {};
        
        currentStudents.forEach(student => {
            const studentIdStr = student._id!.toString();
            if (isCBSETemplate) {
                if (isCurrentAssessmentFA) {
                    initialMarks[studentIdStr] = { tool1: null, maxTool1: 10, tool2: null, maxTool2: 10, tool3: null, maxTool3: 10, tool4: null, maxTool4: 20 };
                } else if (isCurrentAssessmentSA) {
                    initialMarks[studentIdStr] = { p1Marks: null, p1Max: defaultMaxMarks, p2Marks: null, p2Max: defaultMaxMarks };
                }
            } else if (isNursingTemplate) {
                initialMarks[studentIdStr] = { marksObtained: null, maxMarks: defaultMaxMarks };
            }
        });

        if (marksResult.success && marksResult.marks) {
            marksResult.marks.forEach(mark => {
                const studentIdStr = mark.studentId.toString();
                if (!initialMarks[studentIdStr]) return;

                if (isCBSETemplate) {
                    if (isCurrentAssessmentFA) {
                        const assessmentNameParts = mark.assessmentName.split('-');
                        if (assessmentNameParts.length === 2) {
                            const faBaseName = assessmentNameParts[0];
                            const toolKeyRaw = assessmentNameParts[1];
                            const toolKey = toolKeyRaw.toLowerCase().replace('tool', 'tool') as FaToolKey;

                            if (faBaseName === selectedAssessment && toolKey in initialMarks[studentIdStr]!) {
                                (initialMarks[studentIdStr] as StudentMarksFAState)[toolKey] = mark.marksObtained;
                                (initialMarks[studentIdStr] as StudentMarksFAState)[`max${toolKey.charAt(0).toUpperCase() + toolKey.slice(1)}` as keyof StudentMarksFAState] = mark.maxMarks;
                            }
                        }
                    } else if (isCurrentAssessmentSA) {
                         if (mark.assessmentName === `${selectedAssessment}-Paper1`) {
                            (initialMarks[studentIdStr] as StudentMarksSAState).p1Marks = mark.marksObtained;
                            (initialMarks[studentIdStr] as StudentMarksSAState).p1Max = mark.maxMarks;
                        } else if (mark.assessmentName === `${selectedAssessment}-Paper2`) {
                            (initialMarks[studentIdStr] as StudentMarksSAState).p2Marks = mark.marksObtained;
                            (initialMarks[studentIdStr] as StudentMarksSAState).p2Max = mark.maxMarks;
                        }
                    }
                } else if (isNursingTemplate) {
                    if (mark.assessmentName === selectedAssessment) {
                        (initialMarks[studentIdStr] as StudentMarksNursingState).marksObtained = mark.marksObtained;
                        (initialMarks[studentIdStr] as StudentMarksNursingState).maxMarks = mark.maxMarks;
                    }
                }
            });
        }
        setStudentMarks(initialMarks);

      } else {
        toast({ variant: "destructive", title: "Error", description: studentsResult.message || "Failed to load students."});
        setStudentsForMarks([]); setStudentMarks({}); setSelectedStudentIds({});
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred."});
      console.error("Error in fetchStudentsAndMarks:", error);
      setStudentsForMarks([]); setStudentMarks({}); setSelectedStudentIds({});
    } finally {
      setIsLoadingStudentsAndMarks(false);
    }
  }, [authUser, selectedSubject, selectedAssessment, selectedAcademicYear, toast, isCBSETemplate, isCurrentAssessmentFA, isCurrentAssessmentSA, isNursingTemplate, defaultMaxMarks]);

  useEffect(() => {
    if (selectedSubject && selectedSubject.classId && selectedAssessment && selectedAcademicYear) {
      fetchStudentsAndMarks();
    } else {
      setStudentsForMarks([]); setStudentMarks({}); setSelectedStudentIds({});
    }
  }, [selectedSubject, selectedAssessment, selectedAcademicYear, fetchStudentsAndMarks]);

  const handleSubjectChange = (value: string) => {
    const subjectInfo = availableSubjects.find(s => s.value === value);
    setSelectedSubject(subjectInfo || null);
    setSelectedAssessment("");
    setStudentsForMarks([]); setStudentMarks({}); setSelectedStudentIds({});
  };

  const handleMarksChange = (studentId: string, fieldOrToolKey: FaToolKey | keyof StudentMarksSAState | keyof StudentMarksNursingState, value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10);
    const validatedValue = isNaN(numValue as number) ? null : numValue;

    setStudentMarks(prev => {
      const currentStudentMarks = { ...(prev[studentId] || {}) };
      (currentStudentMarks as any)[fieldOrToolKey] = validatedValue;
      return { ...prev, [studentId]: currentStudentMarks };
    });
  };
  
  const handleDefaultMaxMarksChange = (value: string) => {
    const newMax = parseInt(value, 10);
    if (!isNaN(newMax) && newMax > 0) {
      setDefaultMaxMarks(newMax);
      setStudentMarks(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(studentId => {
              const current = updated[studentId] as StudentMarksNursingState;
              if (current.maxMarks === defaultMaxMarks || current.maxMarks === undefined || current.maxMarks === null) {
                current.maxMarks = newMax;
              }
          });
          return updated;
        });
    } else if (value === "") {
        setDefaultMaxMarks(80);
    }
  };


  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return; 
    const newSelections: Record<string, boolean> = {};
    studentsForMarks.forEach(student => { newSelections[student._id!.toString()] = checked as boolean; });
    setSelectedStudentIds(newSelections);
  };

  const handleStudentSelectionChange = (studentId: string, checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    setSelectedStudentIds(prev => ({ ...prev, [studentId]: checked as boolean }));
  };
  
  const allStudentsSelected = studentsForMarks.length > 0 && studentsForMarks.every(s => selectedStudentIds[s._id!.toString()]);
  const someStudentsSelected = studentsForMarks.some(s => selectedStudentIds[s._id!.toString()]);
  const selectAllCheckboxState = allStudentsSelected ? true : (someStudentsSelected ? 'indeterminate' : false);

  const handleSubmit = async () => {
    if (!authUser || !authUser._id || !authUser.schoolId || !selectedSubject || !selectedAssessment || !selectedAcademicYear || studentsForMarks.length === 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select all fields and ensure students are loaded." });
      return;
    }
    
    const finalSelectedStudentIds = Object.entries(selectedStudentIds).filter(([, isSelected]) => isSelected).map(([id]) => id);
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
          if (marksObtained === null || marksObtained < 0 || maxMarks <= 0 || marksObtained > maxMarks) {
             toast({ variant: "destructive", title: "Invalid Marks", description: `Marks for ${student.name} (${tool.label}) are invalid or exceed max marks.`}); setIsSubmitting(false); return;
          }
          marksToSubmit.push({ studentId: studentIdStr, studentName: student.name || "N/A", marksObtained, maxMarks, assessmentName: `${selectedAssessment}-${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}` });
        }
      } else if (isCurrentAssessmentSA) {
        const saData = currentStudentMarkState as StudentMarksSAState;
        if (saData.p1Marks !== null && saData.p1Max !== null) {
            if (saData.p1Marks < 0 || saData.p1Max <= 0 || saData.p1Marks > saData.p1Max) { toast({ variant: "destructive", title: "Invalid Marks", description: `Paper 1 marks for ${student.name} are invalid or exceed max marks.`}); setIsSubmitting(false); return; }
            marksToSubmit.push({ studentId: studentIdStr, studentName: student.name || "N/A", marksObtained: saData.p1Marks, maxMarks: saData.p1Max, assessmentName: `${selectedAssessment}-Paper1` });
        }
        if (saData.p2Marks !== null && saData.p2Max !== null) {
            if (saData.p2Marks < 0 || saData.p2Max <= 0 || saData.p2Marks > saData.p2Max) { toast({ variant: "destructive", title: "Invalid Marks", description: `Paper 2 marks for ${student.name} are invalid or exceed max marks.`}); setIsSubmitting(false); return; }
            marksToSubmit.push({ studentId: studentIdStr, studentName: student.name || "N/A", marksObtained: saData.p2Marks, maxMarks: saData.p2Max, assessmentName: `${selectedAssessment}-Paper2` });
        }
      } else if (isNursingTemplate) {
        const nursingData = currentStudentMarkState as StudentMarksNursingState;
        if (nursingData.marksObtained !== null && nursingData.maxMarks > 0) {
            if (nursingData.marksObtained < 0 || nursingData.marksObtained > nursingData.maxMarks) { toast({ variant: "destructive", title: "Invalid Marks", description: `Marks for ${student.name} are invalid or exceed max marks.`}); setIsSubmitting(false); return; }
            marksToSubmit.push({ studentId: studentIdStr, studentName: student.name || "N/A", marksObtained: nursingData.marksObtained, maxMarks: nursingData.maxMarks, assessmentName: selectedAssessment });
        }
      }
    }
    
    if (marksToSubmit.length === 0) {
        toast({ variant: "info", title: "No Valid Marks", description: "No valid marks were entered for the selected students." });
        setIsSubmitting(false); return;
    }

    const payload: MarksSubmissionPayload = {
      classId: selectedSubject.classId, className: selectedSubject.className,
      subjectId: selectedSubject.subjectName, subjectName: selectedSubject.subjectName,
      academicYear: selectedAcademicYear, markedByTeacherId: authUser._id.toString(),
      schoolId: authUser.schoolId.toString(), studentMarks: marksToSubmit,
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

  const assessmentOptions = isCBSETemplate ? CBSE_ASSESSMENT_TYPES : (isNursingTemplate ? NURSING_ASSESSMENT_TYPES : []);

  if (isLoadingSchoolDetails || !authUser) {
    return (
      <Card className="mt-6">
        <CardHeader><CardTitle>Loading Configuration...</CardTitle></CardHeader>
        <CardContent className="flex justify-center items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookCopy className="mr-2 h-6 w-6" /> Enter Student Marks
          </CardTitle>
          <CardDescription>
            Report Card Template: <span className="font-semibold">{schoolDetails?.reportCardTemplate === 'cbse_state' ? 'CBSE State Pattern' : schoolDetails?.reportCardTemplate === 'nursing_college' ? 'Nursing College' : 'Default'}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle>Selection Criteria</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="subject-select">Subject (Class)</Label>
            <Select onValueChange={handleSubjectChange} value={selectedSubject?.value || ""} disabled={isLoadingSubjects || availableSubjects.length === 0}>
              <SelectTrigger id="subject-select"><SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select subject"} /></SelectTrigger>
              <SelectContent>{availableSubjects.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="assessment-select">Assessment</Label>
            <Select onValueChange={setSelectedAssessment} value={selectedAssessment} disabled={!selectedSubject || assessmentOptions.length === 0}>
              <SelectTrigger id="assessment-select"><SelectValue placeholder={assessmentOptions.length > 0 ? "Select assessment" : "Template not supported"} /></SelectTrigger>
              <SelectContent>{assessmentOptions.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="academic-year-input">Academic Year</Label>
            <Input id="academic-year-input" value={selectedAcademicYear} onChange={(e) => setSelectedAcademicYear(e.target.value)} placeholder="e.g., 2023-2024" disabled={!selectedSubject}/>
          </div>
        </CardContent>
      </Card>

      {selectedSubject && selectedAssessment && selectedAcademicYear && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Marks for: {selectedSubject.label} - {selectedAssessment} ({selectedAcademicYear})</CardTitle>
            {(isNursingTemplate || isCurrentAssessmentSA) && (
             <div className="mt-2">
                <Label htmlFor="default-max-marks">Default Max Marks</Label>
                <Input id="default-max-marks" type="number" className="w-32" value={defaultMaxMarks} onChange={(e) => handleDefaultMaxMarksChange(e.target.value)} disabled={isSubmitting || isLoadingStudentsAndMarks} />
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
                      <TableHead className="w-12"><Checkbox checked={selectAllCheckboxState} onCheckedChange={handleSelectAllChange}/></TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission ID</TableHead>
                      {isCurrentAssessmentFA && FA_TOOLS.map(tool => <TableHead key={tool.key} className="w-28 text-center">{tool.label} ({tool.maxMarks}M)</TableHead>)}
                      {isCurrentAssessmentSA && (<><TableHead className="w-36 text-center">P1 Marks</TableHead><TableHead className="w-32 text-center">P1 Max</TableHead><TableHead className="w-36 text-center">P2 Marks</TableHead><TableHead className="w-32 text-center">P2 Max</TableHead></>)}
                      {isNursingTemplate && (<><TableHead className="w-36 text-center">Marks Obtained</TableHead><TableHead className="w-32 text-center">Max Marks</TableHead></>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsForMarks.map(student => {
                      const studentIdStr = student._id!.toString();
                      const currentMarksState = studentMarks[studentIdStr];
                      return (
                        <TableRow key={studentIdStr}>
                          <TableCell><Checkbox checked={!!selectedStudentIds[studentIdStr]} onCheckedChange={(c) => handleStudentSelectionChange(studentIdStr, c)}/></TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.admissionId || 'N/A'}</TableCell>
                          {isCurrentAssessmentFA && currentMarksState && FA_TOOLS.map(tool => (<TableCell key={tool.key}><Input type="number" value={(currentMarksState as StudentMarksFAState)[tool.key] ?? ""} onChange={e => handleMarksChange(studentIdStr, tool.key, e.target.value)} disabled={isSubmitting} max={(currentMarksState as StudentMarksFAState)[`max${tool.key.charAt(0).toUpperCase() + tool.key.slice(1)}` as keyof StudentMarksFAState] as number} min="0"/></TableCell>))}
                          {isCurrentAssessmentSA && currentMarksState && (<>
                              <TableCell><Input type="number" value={(currentMarksState as StudentMarksSAState)?.p1Marks ?? ""} onChange={e => handleMarksChange(studentIdStr, 'p1Marks', e.target.value)} disabled={isSubmitting} max={(currentMarksState as StudentMarksSAState)?.p1Max ?? defaultMaxMarks} min="0"/></TableCell>
                              <TableCell><Input type="number" value={(currentMarksState as StudentMarksSAState)?.p1Max ?? defaultMaxMarks} onChange={e => handleMarksChange(studentIdStr, 'p1Max', e.target.value)} disabled={isSubmitting} min="1"/></TableCell>
                              <TableCell><Input type="number" value={(currentMarksState as StudentMarksSAState)?.p2Marks ?? ""} onChange={e => handleMarksChange(studentIdStr, 'p2Marks', e.target.value)} disabled={isSubmitting} max={(currentMarksState as StudentMarksSAState)?.p2Max ?? defaultMaxMarks} min="0"/></TableCell>
                              <TableCell><Input type="number" value={(currentMarksState as StudentMarksSAState)?.p2Max ?? defaultMaxMarks} onChange={e => handleMarksChange(studentIdStr, 'p2Max', e.target.value)} disabled={isSubmitting} min="1"/></TableCell>
                            </>)}
                          {isNursingTemplate && currentMarksState && (<>
                              <TableCell><Input type="number" value={(currentMarksState as StudentMarksNursingState)?.marksObtained ?? ""} onChange={e => handleMarksChange(studentIdStr, 'marksObtained', e.target.value)} disabled={isSubmitting} max={(currentMarksState as StudentMarksNursingState)?.maxMarks ?? defaultMaxMarks} min="0"/></TableCell>
                              <TableCell><Input type="number" value={(currentMarksState as StudentMarksNursingState)?.maxMarks ?? defaultMaxMarks} onChange={e => handleMarksChange(studentIdStr, 'maxMarks', e.target.value)} disabled={isSubmitting} min="1"/></TableCell>
                            </>)}
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
              <p className="text-center text-muted-foreground py-4">{selectedSubject ? `No students found for class ${selectedSubject.className}.` : "Select criteria to load students."}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


