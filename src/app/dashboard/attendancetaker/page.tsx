
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, CalendarDays, Save, Loader2, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitAttendance } from "@/app/actions/attendance";
import { getStudentsByClass } from "@/app/actions/schoolUsers";
import { getAssignedClassesForUser, type AssignedClassInfo } from "@/app/actions/marks"; 
import type { AttendanceEntry, AttendanceStatus, AttendanceSubmissionPayload } from "@/types/attendance";
import type { AuthUser } from "@/types/user";

export default function AttendanceTakerPage() {
  const [attendanceDate, setAttendanceDate] = useState<Date | undefined>(new Date());
  const [studentAttendance, setStudentAttendance] = useState<AttendanceEntry[]>([]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [assignedClasses, setAssignedClasses] = useState<AssignedClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'attendancetaker') {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          if (parsedUser?.role !== 'attendancetaker') {
            toast({ variant: "destructive", title: "Access Denied", description: "You must be an Attendance Taker to view this page." });
          }
        }
      } catch (e) {
        setAuthUser(null);
      }
    } else {
      setAuthUser(null);
    }
  }, [toast]);
  
  const fetchAssignedClasses = useCallback(async () => {
    if (authUser && authUser._id && authUser.schoolId && authUser.classIds) {
        setIsLoading(true);
        const classInfo = await getAssignedClassesForUser(authUser._id, authUser.schoolId, authUser.classIds);
        setAssignedClasses(classInfo);
        setIsLoading(false);
    } else {
        setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchAssignedClasses();
  }, [fetchAssignedClasses]);

  const fetchStudentsForClass = useCallback(async (classId: string) => {
    if (!authUser || !authUser.schoolId || !classId) {
      setStudentAttendance([]);
      return;
    }
    setIsLoading(true);
    const studentsResult = await getStudentsByClass(authUser.schoolId.toString(), classId);
    if (studentsResult.success && studentsResult.users) {
      const studentEntries: AttendanceEntry[] = studentsResult.users.map(student => ({
        studentId: student._id!.toString(),
        studentName: student.name || 'Unknown Student',
        status: 'present',
      }));
      setStudentAttendance(studentEntries);
    } else {
      toast({ variant: "destructive", title: "Error Loading Students", description: studentsResult.message || "Could not fetch students for the selected class." });
      setStudentAttendance([]);
    }
    setIsLoading(false);
  }, [authUser, toast]);

  useEffect(() => {
    if(selectedClassId) {
        fetchStudentsForClass(selectedClassId);
    } else {
        setStudentAttendance([]);
    }
  }, [selectedClassId, fetchStudentsForClass]);


  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSubmitAttendance = async () => {
    const selectedClassInfo = assignedClasses.find(c => c.id === selectedClassId);
    if (!authUser || !authUser.schoolId || !authUser._id || !selectedClassInfo) {
      toast({ variant: "destructive", title: "Error", description: "User or class information not found." });
      return;
    }
    if (!attendanceDate || studentAttendance.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select a date and ensure students are listed." });
      return;
    }
    setIsSubmitting(true);
    const payload: AttendanceSubmissionPayload = {
      classId: selectedClassInfo.id,
      className: selectedClassInfo.name,
      schoolId: authUser.schoolId.toString(),
      date: attendanceDate,
      entries: studentAttendance,
      markedByTeacherId: authUser._id.toString(),
    };
    const result = await submitAttendance(payload);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Attendance Submitted", description: result.message });
    } else {
      toast({ variant: "destructive", title: "Submission Failed", description: result.error || result.message });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CheckSquare className="mr-2 h-6 w-6" /> Centralized Attendance Marking
          </CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : "Select a class to mark student attendance."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
             <div>
                <Label htmlFor="class-select" className="mb-1 block text-sm font-medium">Select Class</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={isSubmitting || isLoading || assignedClasses.length === 0}>
                    <SelectTrigger id="class-select" className="w-full sm:w-[280px]">
                        <SelectValue placeholder={assignedClasses.length > 0 ? "Select a class to manage" : "No classes assigned"} />
                    </SelectTrigger>
                    <SelectContent>
                        {assignedClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
            <div>
              <Label htmlFor="date-picker" className="mb-1 block text-sm font-medium">Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date-picker" variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal" disabled={isSubmitting || isLoading || !attendanceDate}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {attendanceDate ? format(attendanceDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={attendanceDate} onSelect={setAttendanceDate} initialFocus disabled={(date) => date > new Date() || date < new Date("2000-01-01")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {studentAttendance.length > 0 && (
            <div className="flex gap-2 mt-4 md:mt-0 self-start md:self-center">
              <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')} disabled={isSubmitting || isLoading}>Mark All Present</Button>
              <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')} disabled={isSubmitting || isLoading}>Mark All Absent</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && !selectedClassId ? (
             <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading assigned classes...</p></div>
          ) : !selectedClassId ? (
            <div className="text-center py-6">
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">
                    {assignedClasses.length > 0 ? "No Class Selected" : "No Classes Assigned"}
                </p>
                <p className="text-muted-foreground">
                    {assignedClasses.length > 0 ? "Please select a class from the dropdown above to view the student list." : "Please contact your school administrator to be assigned to classes."}
                </p>
            </div>
          ) : isLoading ? (
             <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading students...</p></div>
          ) : studentAttendance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentAttendance.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>{student.studentId.substring(0, 8)}...</TableCell>
                    <TableCell>{student.studentName}</TableCell>
                    <TableCell className="text-center"><Checkbox checked={student.status === 'present'} onCheckedChange={(c) => c && handleAttendanceChange(student.studentId, 'present')} disabled={isSubmitting} /></TableCell>
                    <TableCell className="text-center"><Checkbox checked={student.status === 'absent'} onCheckedChange={(c) => c && handleAttendanceChange(student.studentId, 'absent')} disabled={isSubmitting} /></TableCell>
                    <TableCell className="text-center"><Checkbox checked={student.status === 'late'} onCheckedChange={(c) => c && handleAttendanceChange(student.studentId, 'late')} disabled={isSubmitting} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No students found for the selected class.</p>
          )}
          {studentAttendance.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSubmitAttendance} disabled={isSubmitting || isLoading || !attendanceDate}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><Save className="mr-2 h-4 w-4" /> Submit Attendance</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
