
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookUser, Briefcase } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminUserManagementPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> School User Management
          </CardTitle>
          <CardDescription>
            Manage individual student and staff accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start space-y-4">
            <p className="text-muted-foreground">Please select a category below to manage users.</p>
            <div className="flex flex-wrap gap-4">
                <Button asChild>
                    <Link href="/dashboard/admin/students">
                        <BookUser className="mr-2 h-4 w-4"/> Manage Students
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/dashboard/admin/teachers">
                        <Briefcase className="mr-2 h-4 w-4"/> Manage Staff
                    </Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
