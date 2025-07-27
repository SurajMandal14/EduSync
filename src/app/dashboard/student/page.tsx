
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, CalendarCheck, BookMarked, UserCircle, Loader2, ListChecks, RefreshCw, AlertTriangle, Trophy, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useStudentData } from '@/contexts/StudentDataContext'; // StudentDataProvider is no longer imported here
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";

function StudentDashboardContent() {
  const {
    authUser,
    attendanceSummary,
    feeSummary,
    isLoading,
    error,
    refreshData
  } = useStudentData();
  
  const [showPasswordAlert, setShowPasswordAlert] = useState(false);

  useEffect(() => {
    // Check if the user needs to change their password
    const userRequiresPasswordChange = !!sessionStorage.getItem('requiresPasswordChange');
    if (userRequiresPasswordChange) {
      setShowPasswordAlert(true);
    }
  }, []);

  const handleDismissPasswordAlert = () => {
    setShowPasswordAlert(false);
    sessionStorage.removeItem('requiresPasswordChange');
  };


  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-10 min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
     return (
      <Card className="mt-6">
        <CardHeader className="flex-row items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive"/>
            <CardTitle>Error Loading Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <p className="text-muted-foreground mt-2">Please try refreshing, or contact support if the issue persists.</p>
          <Button onClick={refreshData} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
     );
  }

  if (!authUser) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in as a student to view your dashboard.</p>
           <Button asChild className="mt-4"><Link href="/">Go to Login</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showPasswordAlert && (
          <Alert variant="destructive" className="relative">
             <AlertCircle className="h-4 w-4" />
            <AlertTitle>Security Alert: Change Your Password</AlertTitle>
            <AlertDescription>
              You have logged in with a default password. For your security, please change it immediately.
              <Button asChild variant="link" className="font-bold p-0 pl-1 text-destructive">
                 <Link href="/dashboard/profile">Go to Profile</Link>
              </Button>
            </AlertDescription>
             <button
              onClick={handleDismissPasswordAlert}
              className="absolute top-2 right-2 p-1 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-headline">Student Dashboard</CardTitle>
            <CardDescription>
              Welcome, {authUser.name}!
              {authUser.registrationNo && ` (Reg. No: ${authUser.registrationNo})`}
              {authUser.classId && ` (Class: ${authUser.classId})`}
            </CardDescription>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm" className="mt-2 sm:mt-0">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </CardHeader>
        {/* Removed welcome paragraph from CardContent */}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Fee Status</CardTitle>
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {feeSummary ? (
              <>
                <div className="text-3xl font-bold"><span className="font-sans">₹</span>{feeSummary.totalDue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Due out of <span className="font-sans">₹</span>{feeSummary.totalFee.toLocaleString()}</p>
                <Progress value={feeSummary.percentagePaid} className="mt-2 h-3" />
                <div className="mt-2 flex justify-between text-sm">
                  <span>Paid: <span className="font-sans">₹</span>{feeSummary.totalPaid.toLocaleString()}</span>
                  <span className={`font-semibold ${feeSummary.totalDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {feeSummary.totalDue > 0 ? "Partially Paid" : "Fully Paid"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Fee details are loading or unavailable. {authUser.classId ? "" : "Class assignment missing."}</p>
            )}
             <Button asChild variant="link" className="px-0 mt-2">
                <Link href="/dashboard/student/fees">View Full Fee Details <ListChecks className="ml-1 h-4 w-4"/> </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Attendance Overview</CardTitle>
            <CalendarCheck className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {attendanceSummary.total > 0 ? (
              <>
                <div className="text-3xl font-bold">{attendanceSummary.percentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {attendanceSummary.present + attendanceSummary.late} present out of {attendanceSummary.total} days
                </p>
                <Progress value={attendanceSummary.percentage} className="mt-2 h-3" />
                <div className="mt-2 flex justify-between text-sm">
                  <span>Present: {attendanceSummary.present}</span>
                  <span>Late: {attendanceSummary.late}</span>
                  <span>Absent: {attendanceSummary.absent}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No attendance records found yet.</p>
            )}
             <Button asChild variant="link" className="px-0 mt-2">
                <Link href="/dashboard/student/attendance">View Full Attendance Log <ListChecks className="ml-1 h-4 w-4"/> </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/student/courses"><BookMarked className="mr-2 h-5 w-5"/> My Courses</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/student/profile"><UserCircle className="mr-2 h-5 w-5"/> My Profile</Link>
            </Button>
             <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/student/results"><Trophy className="mr-2 h-5 w-5"/> Exam Results</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export default function StudentDashboardPage() {
  return <StudentDashboardContent />;
}
