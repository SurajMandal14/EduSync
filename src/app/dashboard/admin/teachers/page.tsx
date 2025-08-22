
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Loader2 } from "lucide-react";
import type { User as AppUser } from "@/types/user";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";
import { getSchoolUsers } from "@/app/actions/schoolUsers"; 
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";


type SchoolStaff = Partial<AppUser>; 

export default function AdminStaffManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [allSchoolStaff, setAllSchoolStaff] = useState<SchoolStaff[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
        }
      } catch (e) { setAuthUser(null); }
    } else { setAuthUser(null); }
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (!authUser || !authUser.schoolId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const usersResult = await getSchoolUsers(authUser.schoolId.toString());
      if (usersResult.success && usersResult.users) {
        setAllSchoolStaff(usersResult.users.filter(u => u.role === 'teacher' || u.role === 'attendancetaker'));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load staff." });
        setAllSchoolStaff([]);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId) fetchInitialData();
    else { setIsLoadingData(false); setAllSchoolStaff([]); }
  }, [authUser, fetchInitialData]);

  
  const filteredStaff = allSchoolStaff.filter(user => 
    Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!authUser && !isLoadingData) { 
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>Please log in as an admin.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> Staff Management
          </CardTitle>
          <CardDescription>
            Overview of all teachers and attendance takers in your school.
          </CardDescription>
        </CardHeader>
         <CardContent>
             <div className="flex flex-wrap gap-2 items-center">
                <Button asChild>
                    <Link href="/dashboard/admin/attendancetaker">Manage Attendance Takers</Link>
                </Button>
                {/* Add a button for managing teachers if a separate page is made */}
            </div>
         </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Staff List</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search staff..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoadingData || !allSchoolStaff.length}/>
              <Button variant="outline" size="icon" disabled={isLoadingData || !allSchoolStaff.length}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading staff members...</p></div>
          ) : filteredStaff.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Date Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow key={staff._id?.toString()}>
                  <TableCell>{staff.name}</TableCell>
                  <TableCell>{staff.email}</TableCell>
                  <TableCell className="capitalize">{staff.role}</TableCell>
                  <TableCell>{staff.createdAt ? format(new Date(staff.createdAt as string), "PP") : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No staff match search." : "No staff found for this school."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

