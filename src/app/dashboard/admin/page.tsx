
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UsersRound, BadgeDollarSign, ClipboardCheck, AreaChart, Settings, Contact, Library, Percent, Loader2, GraduationCap, Users, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import type { AuthUser } from "@/types/user";
import type { School } from "@/types/school";
import type { DailyAttendanceOverview } from "@/types/attendance";
import { getSchoolUserRoleCounts, type SchoolUserRoleCounts } from "@/app/actions/schoolUsers";
import { getDailyAttendanceOverviewForSchool } from "@/app/actions/attendance";
import { getSchoolById } from "@/app/actions/schools";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminDashboardPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [userCounts, setUserCounts] = useState<SchoolUserRoleCounts | null>(null);
  const [attendanceOverview, setAttendanceOverview] = useState<DailyAttendanceOverview | null>(null);

  const [isLoadingSchoolName, setIsLoadingSchoolName] = useState(true);
  const [isLoadingUserCounts, setIsLoadingUserCounts] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
           toast({ variant: "destructive", title: "Access Denied", description: "Not authorized for admin dashboard."});
        }
      } catch(e) {
        setAuthUser(null);
         toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data."});
      }
    } else {
        setAuthUser(null);
    }
  }, [toast]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!authUser || !authUser.schoolId) {
        setIsLoadingSchoolName(false);
        setIsLoadingUserCounts(false);
        setIsLoadingAttendance(false);
        return;
      }

      setIsLoadingSchoolName(true);
      setIsLoadingUserCounts(true);
      setIsLoadingAttendance(true);

      getSchoolById(authUser.schoolId.toString()).then(result => {
        if (result.success && result.school) {
          setSchoolDetails(result.school);
        } else {
          toast({ variant: "warning", title: "School Info", description: "Could not load school name."});
        }
        setIsLoadingSchoolName(false);
      });

      getSchoolUserRoleCounts(authUser.schoolId.toString()).then(result => {
        if (result.success && result.counts) {
          setUserCounts(result.counts);
        } else {
          toast({ variant: "warning", title: "User Stats", description: result.message || "Could not load user counts."});
        }
        setIsLoadingUserCounts(false);
      });

      getDailyAttendanceOverviewForSchool(authUser.schoolId.toString(), new Date()).then(result => {
        if (result.success && result.summary) {
          setAttendanceOverview(result.summary);
        } else {
          toast({ variant: "warning", title: "Attendance Stats", description: result.message || "Could not load today's attendance overview."});
           setAttendanceOverview({ totalStudents: userCounts?.students || 0, present: 0, absent: userCounts?.students || 0, late: 0, percentage: 0 });
        }
        setIsLoadingAttendance(false);
      });
    }

    if (authUser && authUser.schoolId) {
      fetchDashboardData();
    } else {
      setIsLoadingSchoolName(false);
      setIsLoadingUserCounts(false);
      setIsLoadingAttendance(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, toast]);

  const schoolNameDisplay = schoolDetails?.schoolName || (isLoadingSchoolName ? "Loading..." : "Your School");
  const adminName = authUser?.name || "Administrator";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Admin Dashboard - {schoolNameDisplay}</CardTitle>
          <CardDescription>Welcome, {adminName}. Manage student information, fees, attendance, and staff for {schoolNameDisplay}.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
            title="Total Students"
            value={userCounts?.students ?? 'N/A'}
            icon={GraduationCap}
            isLoading={isLoadingUserCounts}
            link="/dashboard/admin/students"
            linkText="Manage Students"
        />
        <StatCard
            title="Total Teachers"
            value={userCounts?.teachers ?? 'N/A'}
            icon={Contact}
            isLoading={isLoadingUserCounts}
            link="/dashboard/admin/teachers"
            linkText="Manage Staff"
        />
        <StatCard
            title="Today's Attendance"
            value={`${attendanceOverview?.percentage ?? 'N/A'}%`}
            icon={Percent}
            isLoading={isLoadingAttendance}
            description={attendanceOverview ? `${attendanceOverview.present + attendanceOverview.late} / ${attendanceOverview.totalStudents} attended` : "Loading data..."}
            link="/dashboard/admin/attendance"
            linkText="View Details"
        />
      </div>


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <UsersRound className="h-10 w-10 text-primary mb-2" />
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Add, edit, and manage student & staff accounts.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Library className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Class Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Define classes and manage subjects offered.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/classes">Manage Classes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <BadgeDollarSign className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Fee Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Track student fee payments, generate receipts, and view fee structures.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/fees">Manage Fees</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <ClipboardCheck className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>View and monitor student attendance records submitted by teachers.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/attendance">View Attendance</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <AreaChart className="h-10 w-10 text-primary mb-2" />
                <CardTitle>School Reports</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>Generate reports on student performance, fees, and attendance.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/admin/reports">View Reports</Link>
                </Button>
            </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <Settings className="h-10 w-10 text-primary mb-2" />
                <CardTitle>School Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>Configure academic years, terms, and other school-specific settings.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/admin/settings">School Settings</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    