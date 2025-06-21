
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Construction } from "lucide-react";

export default function StudentCoursesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BookOpen className="mr-2 h-6 w-6" /> My Courses
          </CardTitle>
          <CardDescription>
            View details about your enrolled courses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">
              Courses Feature Coming Soon
            </h3>
            <p className="text-muted-foreground">
              Information about your courses will be displayed here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
