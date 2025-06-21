
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, CalendarDays, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getDailyAttendanceForSchool } from "@/app/actions/attendance";
import type { AttendanceRecord, AuthUser } from "@/types/attendance";

export default function AdminAttendancePage() {
  const [attendanceDate, setAttendanceDate] = useState<Date | undefined>(undefined);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [filterClass, setFilterClass] = useState("");

  useEffect(() => {
    // Initialize date on client-side
    setAttendanceDate(new Date());

    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
                 setAuthUser(parsedUser);
            } else {
                setAuthUser(null);
                 toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin to view attendance." });
            }
        } catch(e) {
            console.error("Failed to parse user from localStorage in AdminAttendancePage:", e);
            setAuthUser(null);
            toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data. Please log in again." });
        }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const fetchAttendance = useCallback(async () => {
    if (!authUser || !authUser.schoolId) {
      if (authUser && !authUser.schoolId) {
          toast({ variant: "destructive", title: "Error", description: "School information missing for admin." });
      }
      setAttendanceRecords([]);
      return;
    }
    if (!attendanceDate) {
      toast({ variant: "info", title: "Select Date", description: "Please select a date to view attendance." });
      setAttendanceRecords([]);
      return;
    }

    setIsLoading(true);
    const result = await getDailyAttendanceForSchool(authUser.schoolId.toString(), attendanceDate);
    setIsLoading(false);

    if (result.success && result.records) {
      setAttendanceRecords(result.records);
      if (result.records.length === 0) {
        toast({ title: "No Records", description: "No attendance records found for the selected date." });
      }
    } else {
      toast({ variant: "destructive", title: "Failed to load attendance", description: result.error || "Could not fetch attendance data." });
      setAttendanceRecords([]);
    }
  }, [authUser, attendanceDate, toast]);

  useEffect(() => {
    if (authUser && authUser.schoolId && attendanceDate) {
      fetchAttendance();
    } else {
        setAttendanceRecords([]); 
    }
  }, [authUser, attendanceDate, fetchAttendance]);

  const filteredRecords = filterClass
    ? attendanceRecords.filter(record => record.className.toLowerCase().includes(filterClass.toLowerCase()))
    : attendanceRecords;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <CheckSquare className="mr-2 h-6 w-6" /> Student Attendance Overview
          </CardTitle>
          <CardDescription>View student attendance records for your school. Select a date to load records.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <CardTitle>Daily Attendance Records</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-auto">
                        <Label htmlFor="date-picker" className="mb-1 block text-sm font-medium">Select Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date-picker"
                                variant={"outline"}
                                className="w-full sm:w-[240px] justify-start text-left font-normal"
                                disabled={isLoading || !authUser || !attendanceDate}
                            >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {attendanceDate ? format(attendanceDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={attendanceDate}
                                onSelect={setAttendanceDate}
                                initialFocus
                                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="w-full sm:w-auto">
                         <Label htmlFor="filter-class" className="mb-1 block text-sm font-medium">Filter by Class</Label>
                        <Input 
                            id="filter-class"
                            placeholder="Filter class..." 
                            className="w-full sm:w-[180px]" 
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            disabled={isLoading || !authUser || attendanceRecords.length === 0}
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={fetchAttendance} 
                        disabled={isLoading || !authUser || !attendanceDate}
                        className="w-full sm:w-auto"
                    >
                        <Filter className="mr-0 sm:mr-2 h-4 w-4"/> <span className="sm:inline hidden">Apply Filters</span>
                        <span className="sm:hidden inline">Apply</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading attendance records...</p>
            </div>
          ) : !authUser ? (
             <p className="text-center text-muted-foreground py-4">Please log in as a school admin to view attendance.</p>
          ) : !attendanceDate ? (
             <p className="text-center text-muted-foreground py-4">Please select a date to view records.</p>
          ) : filteredRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked By Teacher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record._id.toString()}>
                    <TableCell>{record.studentName}</TableCell>
                    <TableCell>{record.className}</TableCell>
                    <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                            record.status === 'present' ? 'bg-green-100 text-green-800 border border-green-300' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800 border border-red-300' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}>
                            {record.status}
                        </span>
                    </TableCell>
                    <TableCell>{record.markedByTeacherName || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No attendance data available for the selected date and filter combination.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

