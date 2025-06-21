
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TicketPercent, PlusCircle, Trash2, Loader2, Building, User, CalendarFold, Search, Info, DollarSign, Edit, XCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useToast } from "@/hooks/use-toast";
import { applyFeeConcession, getFeeConcessionsForSchool, revokeFeeConcession } from "@/app/actions/concessions";
import { getSchools } from "@/app/actions/schools";
import { getSchoolUsers } from "@/app/actions/schoolUsers";
import type { FeeConcessionFormData, FeeConcession, FeeConcessionType } from '@/types/concessions';
import { feeConcessionFormSchema, CONCESSION_TYPES } from '@/types/concessions';
import type { School } from "@/types/school";
import type { User as AppUser, AuthUser } from "@/types/user";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';

export default function SuperAdminConcessionManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [studentsInSchool, setStudentsInSchool] = useState<AppUser[]>([]);
  const [concessions, setConcessions] = useState<FeeConcession[]>([]);
  
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingConcessions, setIsLoadingConcessions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [concessionToRevoke, setConcessionToRevoke] = useState<FeeConcession | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  
  const [academicYearFilter, setAcademicYearFilter] = useState<string>(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [showAddForm, setShowAddForm] = useState(false);


  const form = useForm<FeeConcessionFormData>({
    resolver: zodResolver(feeConcessionFormSchema),
    defaultValues: {
      studentId: "",
      schoolId: "",
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      concessionType: undefined,
      amount: 0,
      reason: "",
    },
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'superadmin' && parsedUser._id) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a Super Admin." });
        }
      } catch (e) { setAuthUser(null); }
    } else { setAuthUser(null); }

    async function fetchInitialSchools() {
      setIsLoadingSchools(true);
      const schoolsResult = await getSchools();
      if (schoolsResult.success && schoolsResult.schools) {
        setSchools(schoolsResult.schools);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolsResult.message || "Failed to load schools." });
      }
      setIsLoadingSchools(false);
    }
    fetchInitialSchools();
  }, [toast]);

  const fetchStudentsForSchool = useCallback(async (schoolId: string) => {
    if (!schoolId) {
      setStudentsInSchool([]);
      form.resetField("studentId");
      return;
    }
    setIsLoadingStudents(true);
    const studentsResult = await getSchoolUsers(schoolId);
    if (studentsResult.success && studentsResult.users) {
      setStudentsInSchool(studentsResult.users.filter(u => u.role === 'student'));
    } else {
      toast({ variant: "warning", title: "Students", description: studentsResult.message || "Failed to load students for selected school."});
      setStudentsInSchool([]);
    }
    setIsLoadingStudents(false);
  }, [toast, form]);

  const fetchConcessionsForSchool = useCallback(async (schoolId: string, year?: string) => {
    if (!schoolId) {
      setConcessions([]);
      return;
    }
    setIsLoadingConcessions(true);
    const concessionsResult = await getFeeConcessionsForSchool(schoolId, year);
    if (concessionsResult.success && concessionsResult.concessions) {
      setConcessions(concessionsResult.concessions);
    } else {
      toast({ variant: "warning", title: "Concessions", description: concessionsResult.message || "Failed to load concessions for selected school."});
      setConcessions([]);
    }
    setIsLoadingConcessions(false);
  }, [toast]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchStudentsForSchool(selectedSchoolId);
      fetchConcessionsForSchool(selectedSchoolId, academicYearFilter);
      form.setValue("schoolId", selectedSchoolId);
    } else {
      setStudentsInSchool([]);
      setConcessions([]);
      form.resetField("studentId");
      form.resetField("schoolId");
    }
  }, [selectedSchoolId, academicYearFilter, fetchStudentsForSchool, fetchConcessionsForSchool, form]);

  async function onSubmit(values: FeeConcessionFormData) {
    if (!authUser?._id) {
      toast({ variant: "destructive", title: "Error", description: "Super Admin session not found."});
      return;
    }
    setIsSubmitting(true);
    const result = await applyFeeConcession(values, authUser._id.toString());
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Concession Applied", description: result.message });
      form.reset({ ...form.getValues(), studentId: "", amount: 0, reason: "", concessionType: undefined });
      setShowAddForm(false);
      if (selectedSchoolId) fetchConcessionsForSchool(selectedSchoolId, academicYearFilter);
    } else {
      toast({ variant: "destructive", title: "Application Failed", description: result.error || result.message });
    }
  }

  const handleRevokeConcession = async () => {
    if (!concessionToRevoke?._id) return;
    setIsRevoking(true);
    const result = await revokeFeeConcession(concessionToRevoke._id.toString());
    setIsRevoking(false);
    if (result.success) {
      toast({ title: "Concession Revoked", description: result.message });
      if (selectedSchoolId) fetchConcessionsForSchool(selectedSchoolId, academicYearFilter);
    } else {
      toast({ variant: "destructive", title: "Revocation Failed", description: result.error || result.message });
    }
    setConcessionToRevoke(null);
  };
  
  const openAddForm = () => {
    setShowAddForm(true);
    form.reset({
      studentId: "",
      schoolId: selectedSchoolId,
      academicYear: academicYearFilter,
      concessionType: undefined,
      amount: 0,
      reason: "",
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <TicketPercent className="mr-2 h-6 w-6" /> Fee Concession Management
          </CardTitle>
          <CardDescription>Apply and manage student fee concessions.</CardDescription>
        </CardHeader>
      </Card>
      
      {!showAddForm && (
        <Button onClick={openAddForm}><PlusCircle className="mr-2 h-4 w-4"/>Apply New Concession</Button>
      )}

      {showAddForm && (
        <Card>
            <CardHeader>
            <CardTitle>Apply New Concession</CardTitle>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                    control={form.control}
                    name="schoolId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground"/>Select School</FormLabel>
                        <Select
                            onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedSchoolId(value);
                            }}
                            value={field.value}
                            disabled={isSubmitting || isLoadingSchools || schools.length === 0}
                        >
                            <FormControl><SelectTrigger>
                                <SelectValue placeholder={isLoadingSchools ? "Loading schools..." : (schools.length === 0 ? "No schools available" : "Select a school")} />
                            </SelectTrigger></FormControl>
                            <SelectContent>
                            {schools.map((school) => (
                                <SelectItem key={school._id} value={school._id.toString()}>{school.schoolName}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Select Student</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting || isLoadingStudents || studentsInSchool.length === 0 || !selectedSchoolId}
                        >
                            <FormControl><SelectTrigger>
                                <SelectValue placeholder={
                                    !selectedSchoolId ? "Select school first" :
                                    isLoadingStudents ? "Loading students..." : 
                                    (studentsInSchool.length === 0 ? "No students in school" : "Select a student")
                                } />
                            </SelectTrigger></FormControl>
                            <SelectContent>
                            {studentsInSchool.map((student) => (
                                <SelectItem key={student._id!.toString()} value={student._id!.toString()}>{student.name} ({student.admissionId || 'N/A'})</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField control={form.control} name="academicYear" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><CalendarFold className="mr-2 h-4 w-4 text-muted-foreground"/>Academic Year</FormLabel>
                        <FormControl><Input placeholder="e.g., 2023-2024" {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <FormField control={form.control} name="concessionType" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Concession Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value as string | undefined} disabled={isSubmitting}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select concession type" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {CONCESSION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>Concession Amount (<span className="font-sans">₹</span>)</FormLabel>
                        <FormControl><Input type="number" placeholder="0.00" {...field} disabled={isSubmitting} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem className="lg:col-span-3">
                        <FormLabel>Reason for Concession</FormLabel>
                        <FormControl><Textarea placeholder="Detailed reason..." {...field} disabled={isSubmitting} rows={3} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                </div>
                <div className="flex gap-2">
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || !form.formState.isValid}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                        Apply Concession
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} disabled={isSubmitting}>
                        <XCircle className="mr-2 h-4 w-4"/>Cancel
                    </Button>
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>
      )}
      

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Existing Fee Concessions</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="academicYearFilter" className="whitespace-nowrap">Filter Year:</Label>
              <Input 
                id="academicYearFilter"
                placeholder="e.g., 2023-2024" 
                className="w-full sm:w-[180px]" 
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                disabled={isLoadingConcessions || !selectedSchoolId}
              />
               <Button variant="outline" size="icon" onClick={() => fetchConcessionsForSchool(selectedSchoolId, academicYearFilter)} disabled={isLoadingConcessions || !selectedSchoolId}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
           {!selectedSchoolId && <CardDescription className="text-sm text-muted-foreground">Select a school above to view its concessions.</CardDescription>}
        </CardHeader>
        <CardContent>
          {isLoadingConcessions ? (
             <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading concessions...</p></div>
          ) : !selectedSchoolId ? (
             <p className="text-center text-muted-foreground py-4">Please select a school to view concessions.</p>
          ) : concessions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (<span className="font-sans">₹</span>)</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concessions.map((con) => (
                <TableRow key={con._id.toString()}>
                  <TableCell>{con.studentName || 'N/A'}</TableCell>
                  <TableCell>{con.schoolName || 'N/A'}</TableCell>
                  <TableCell>{con.academicYear}</TableCell>
                  <TableCell>{con.concessionType}</TableCell>
                  <TableCell className="text-right"><span className="font-sans">₹</span>{con.amount.toLocaleString()}</TableCell>
                  <TableCell className="max-w-xs truncate" title={con.reason}>{con.reason}</TableCell>
                  <TableCell>{con.appliedBySuperAdminName || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(con.createdAt), "PP")}</TableCell>
                  <TableCell>
                    <AlertDialog open={concessionToRevoke?._id === con._id} onOpenChange={(open) => !open && setConcessionToRevoke(null)}>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setConcessionToRevoke(con)} disabled={isRevoking} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                      {concessionToRevoke && concessionToRevoke._id === con._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will revoke the concession of <span className="font-sans">₹</span>{concessionToRevoke.amount} for {concessionToRevoke.studentName}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setConcessionToRevoke(null)} disabled={isRevoking}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRevokeConcession} disabled={isRevoking} className="bg-destructive hover:bg-destructive/90">
                              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      )}
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          ) : (
             <p className="text-center text-muted-foreground py-4">No concessions found for the selected school and academic year.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
