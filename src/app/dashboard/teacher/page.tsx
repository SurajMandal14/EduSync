
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardCheck, Presentation, MessagesSquare, CalendarRange, CircleUser, Loader2, Info, Users } from "lucide-react";
import { useState, useEffect } from "react";
import type { AuthUser } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { getStudentCountByClass } from "@/app/actions/schoolUsers";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  isLoading: boolean;
  description?: string;
  link?: string;
  linkText?: string;
}

function StatCard({ title, value, icon: Icon, isLoading, description, link, linkText }: StatCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
        {link && linkText && !isLoading && (
          <Link href={link} className="text-xs text-primary hover:underline mt-1 block">
            {linkText}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}


export default function TeacherDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [isLoadingStudentCount, setIsLoadingStudentCount] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'teacher') {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
        }
      } catch(e) {
        console.error("TeacherDashboard: Failed to parse user from localStorage", e);
        setAuthUser(null);
        toast({ variant: "destructive", title: "Session Error", description: "Could not load user data."});
      }
    } else {
      setAuthUser(null);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    async function fetchStudentCount() {
      if (authUser && authUser.schoolId && authUser.classId) {
        setIsLoadingStudentCount(true);
        const result = await getStudentCountByClass(authUser.schoolId.toString(), authUser.classId);
        if (result.success && result.count !== undefined) {
          setStudentCount(result.count);
        } else {
          toast({ variant: "warning", title: "Student Count", description: result.message || "Could not load student count."});
          setStudentCount(null); // Set to null on error to differentiate from 0
        }
        setIsLoadingStudentCount(false);
      } else {
        setStudentCount(null); // Clear count if no classId or schoolId
      }
    }
    fetchStudentCount();
  }, [authUser, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Info className="mr-2 h-6 w-6 text-destructive"/>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You must be logged in as a teacher to view this page.</p>
           <Button asChild className="mt-4"><Link href="/">Go to Login</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const teacherName = authUser.name || "Teacher";
  const assignedClass = authUser.classId || "your assigned class"; // This might need to be fetched class name based on ID

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Teacher Dashboard</CardTitle>
          <CardDescription>Welcome, {teacherName}. Manage attendance and view information for {assignedClass}.</CardDescription>
        </CardHeader>
         {/* Removed welcome paragraph from CardContent */}
      </Card>

      {authUser.classId && (
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard
                title="Students in Class"
                value={studentCount ?? 'N/A'}
                icon={Users}
                isLoading={isLoadingStudentCount}
                description={assignedClass} // Consider fetching actual class name here
            />
             {/* Placeholder for more stats */}
            <div />
            <div />
        </div>
      )}


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <ClipboardCheck className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Record daily student attendance for {assignedClass}.</CardDescription>
            <Button asChild className="mt-4" disabled={!authUser.classId}>
              <Link href="/dashboard/teacher/attendance">Go to Attendance</Link>
            </Button>
            {!authUser.classId && <p className="text-xs text-destructive mt-1">Class not assigned.</p>}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Presentation className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Class Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>View your daily and weekly teaching schedule.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/teacher/schedule">View Schedule</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <MessagesSquare className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Communication</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Send messages to students, parents, or administration.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/teacher/messages">Open Messages</Link>
            </Button>
          </CardContent>
        </Card>

         <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <CalendarRange className="h-10 w-10 text-primary mb-2" />
                <CardTitle>My Timetable</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>Access your personalized teaching timetable and upcoming events.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/teacher/timetable">View Timetable</Link>
                </Button>
            </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <CircleUser className="h-10 w-10 text-primary mb-2" />
                <CardTitle>My Profile</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>View and update your personal and professional details.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/teacher/profile">View Profile</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
