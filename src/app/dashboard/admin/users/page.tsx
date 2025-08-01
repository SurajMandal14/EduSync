"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Info, UploadCloud } from "lucide-react";
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
            Manage individual student and teacher accounts or perform bulk operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start space-y-4">
            <p className="text-muted-foreground">User management has been separated into dedicated pages.</p>
            <div className="flex flex-wrap gap-4">
                <Button asChild>
                    <Link href="/dashboard/admin/students">Manage Students</Link>
                </Button>
                <Button asChild>
                    <Link href="/dashboard/admin/teachers">Manage Teachers</Link>
                </Button>
                 <Button asChild variant="outline">
                    <Link href="/dashboard/admin/students/import"><UploadCloud className="mr-2 h-4 w-4"/>Bulk Import Students</Link>
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
