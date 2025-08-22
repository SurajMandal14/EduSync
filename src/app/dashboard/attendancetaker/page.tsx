
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
import { submitAttendance } from "@/app/actions/attendance";
import { getStudentsByClass } from "@/app/actions/schoolUsers";
import { getClassDetailsById } from "@/app/actions/classes"; 
import type { AttendanceEntry, AttendanceStatus, AttendanceSubmissionPayload } from "@/types/attendance";
import type { AuthUser } from "@/types/user";
import type { SchoolClass } from "@/types/classes";

export default function AttendanceTakerPage() {
  const [attendanceDate, setAttendanceDate] = useState<Date | undefined>(new Date());
  const [studentAttendance, setStudentAttendance] = useState<AttendanceEntry[]>([]);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [assignedClassDetails, setAssignedClassDetails] = useState<SchoolClass | null>(null);

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

  const fetchClassDetailsAndStudents = useCallback(async () => {
    if (!authUser || !authUser.schoolId || !authUser.classId) {
      setAssignedClassDetails(null);
      setStudentAttendance([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const classResult = await getClassDetailsById(authUser.classId, authUser.schoolId.toString());

    if (classResult.success && classResult.classDetails) {
      const foundClass = classResult.classDetails;
      setAssignedClassDetails(foundClass);

      const studentsResult = await getStudentsByClass(authUser.schoolId.toString(), foundClass._id);
      if (studentsResult.success && studentsResult.users) {
        const studentEntries: AttendanceEntry[] = studentsResult.users.map(student => ({
          studentId: student._id!.toString(),
          studentName: student.name || 'Unknown Student',
          status: 'present',
        }));
        setStudentAttendance(studentEntries);
        if (studentEntries.length === 0) {
          toast({ title: "No Students", description: `No students found in your assigned class: ${foundClass.name}.` });
        }
      } else {
        toast({ variant: "destructive", title: "Error Loading Students", description: studentsResult.message || "Could not fetch students." });
        setStudentAttendance([]);
      }
    } else {
      toast({ variant: "destructive", title: "Class Not Found", description: `Your assigned class (ID: ${authUser.classId}) details could not be found.` });
      setAssignedClassDetails(null);
      setStudentAttendance([]);
    }
    setIsLoading(false);
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId && authUser?.classId) {
      fetchClassDetailsAndStudents();
    } else {
      setIsLoading(false);
    }
  }, [authUser, fetchClassDetailsAndStudents]);

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudentAttendance(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSubmitAttendance = async () => {
    if (!authUser || !authUser.schoolId || !authUser._id || !assignedClassDetails) {
      toast({ variant: "destructive", title: "Error", description: "User or class information not found." });
      return;
    }
    if (!attendanceDate || studentAttendance.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Please select a date and ensure students are listed." });
      return;
    }
    setIsSubmitting(true);
    const payload: AttendanceSubmissionPayload = {
      classId: assignedClassDetails._id,
      className: assignedClassDetails.name,
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
  
  const currentClassName = assignedClassDetails?.name || "your assigned class";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CheckSquare className="mr-2 h-6 w-6" /> Mark Student Attendance
          </CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : assignedClassDetails ? `Marking attendance for class: ${assignedClassDetails.name}.` : "No class assigned. Please contact an administrator."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full md:w-auto">
            {assignedClassDetails && <p className="font-semibold text-lg">Class: {assignedClassDetails.name}</p>}
            <div>
              <Label htmlFor="date-picker" className="mb-1 block text-sm font-medium">Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date-picker" variant="outline" className="w-full sm:w-[280px] justify-start text-left font-normal" disabled={isSubmitting || !authUser || !assignedClassDetails || !attendanceDate}>
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
          {assignedClassDetails && studentAttendance.length > 0 && (
            <div className="flex gap-2 mt-4 md:mt-0 self-start md:self-center">
              <Button variant="outline" size="sm" onClick={() => handleMarkAll('present')} disabled={isSubmitting || isLoading}>Mark All Present</Button>
              <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')} disabled={isSubmitting || isLoading}>Mark All Absent</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>
          ) : !authUser || !authUser.classId || !assignedClassDetails ? (
            <div className="text-center py-6">
              <Info className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">Not Assigned to a Class</p>
              <p className="text-muted-foreground">You must be assigned to a specific class to take attendance. Please contact your school administrator.</p>
            </div>
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
            <p className="text-center text-muted-foreground py-4">No students found for your assigned class: {currentClassName}.</p>
          )}
          {assignedClassDetails && studentAttendance.length > 0 && (
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
