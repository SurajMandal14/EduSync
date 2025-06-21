
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, XSquare, Clock, Percent, Loader2, CalendarClock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStudentAttendanceRecords } from "@/app/actions/attendance";
import type { AttendanceRecord, AuthUser } from "@/types/attendance";

export default function StudentAttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'student' && parsedUser._id && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a student to view this page." });
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        setAuthUser(null);
        toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
      }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const fetchAttendance = useCallback(async () => {
    if (!authUser || !authUser._id || !authUser.schoolId) {
      setIsLoading(false);
      setAttendanceRecords([]);
      if (authUser && (!authUser._id || !authUser.schoolId)) {
         toast({ variant: "destructive", title: "Error", description: "Student or school information missing." });
      }
      return;
    }

    setIsLoading(true);
    const result = await getStudentAttendanceRecords(authUser._id.toString(), authUser.schoolId.toString());
    setIsLoading(false);

    if (result.success && result.records) {
      setAttendanceRecords(result.records);
      if (result.records.length === 0) {
        toast({ title: "No Records", description: "No attendance records found for you." });
      }
    } else {
      toast({ variant: "destructive", title: "Failed to Load Attendance", description: result.error || "Could not fetch your attendance data." });
      setAttendanceRecords([]);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser && authUser._id && authUser.schoolId) {
      fetchAttendance();
    } else {
      setIsLoading(false);
      setAttendanceRecords([]);
    }
  }, [authUser, fetchAttendance]);

  const calculateSummary = () => {
    const totalDays = attendanceRecords.length;
    if (totalDays === 0) {
      return { present: 0, absent: 0, late: 0, percentage: 0, total: 0 };
    }
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    // For percentage, consider 'present' and 'late' as attended
    const attendedDays = present + late;
    const percentage = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;
    return { present, absent, late, percentage, total: totalDays };
  };

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CalendarClock className="mr-2 h-6 w-6" /> My Attendance Record
          </CardTitle>
          <CardDescription>View your attendance history and summary.</CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading your attendance records...</p>
          </CardContent>
        </Card>
      ) : !authUser ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Please log in as a student to view your attendance.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center space-x-3 rounded-lg border p-4 shadow-sm">
                <CheckSquare className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold">{summary.present}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4 shadow-sm">
                <XSquare className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold">{summary.absent}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4 shadow-sm">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold">{summary.late}</p>
                </div>
              </div>
              <div className="flex flex-col space-y-1 rounded-lg border p-4 shadow-sm">
                 <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Overall Percentage</p>
                    <Percent className="h-5 w-5 text-blue-500" />
                 </div>
                <p className="text-2xl font-bold">{summary.percentage}%</p>
                <Progress value={summary.percentage} className="h-2 mt-1" />
                <p className="text-xs text-muted-foreground">{summary.present + summary.late} / {summary.total} days attended</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Log</CardTitle>
              <CardDescription>Detailed view of your attendance records, sorted by most recent.</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record._id.toString()}>
                        <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                        <TableCell>{record.className}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                              record.status === 'present' ? 'bg-green-100 text-green-800 border border-green-300' :
                              record.status === 'absent' ? 'bg-red-100 text-red-800 border border-red-300' :
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">No attendance records found.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

