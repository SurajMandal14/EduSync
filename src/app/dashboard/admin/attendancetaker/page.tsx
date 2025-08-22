
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminAttendanceTakerRedirectPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> Staff Management
          </CardTitle>
          <CardDescription>
            This page has been consolidated. Please manage Attendance Takers from the main Staff Management page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start space-y-4">
            <p className="text-muted-foreground">To add, edit, or view Attendance Takers, please go to the central staff management page.</p>
            <div className="flex flex-wrap gap-4">
                <Button asChild>
                    <Link href="/dashboard/admin/teachers">
                        <Briefcase className="mr-2 h-4 w-4"/> Go to Staff Management
                    </Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
