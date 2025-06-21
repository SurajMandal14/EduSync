
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, Briefcase, XCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { createSchoolUser, getSchoolUsers, updateSchoolUser, deleteSchoolUser } from "@/app/actions/schoolUsers";
import { 
    createTeacherFormSchema, type CreateTeacherFormData,
    updateSchoolUserFormSchema, type UpdateSchoolUserFormData,
    type CreateSchoolUserServerActionFormData
} from '@/types/user';
import { getSchoolById } from "@/app/actions/schools";
import { getSchoolClasses } from "@/app/actions/classes"; 
import type { User as AppUser } from "@/types/user";
import type { School } from "@/types/school";
import type { SchoolClass } from "@/types/classes"; 
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";

type SchoolTeacher = Partial<AppUser>; 

const NONE_CLASS_VALUE = "__NONE_CLASS_ID__";

export default function AdminTeacherManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null); 
  const [managedClasses, setManagedClasses] = useState<SchoolClass[]>([]); 
  const [allSchoolTeachers, setAllSchoolTeachers] = useState<SchoolTeacher[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<SchoolTeacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<SchoolTeacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const teacherForm = useForm<CreateTeacherFormData>({
    resolver: zodResolver(createTeacherFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const editForm = useForm<UpdateSchoolUserFormData>({
    resolver: zodResolver(updateSchoolUserFormSchema),
    defaultValues: { 
        name: "", email: "", password: "", role: 'teacher', classId: "",
        // Student specific fields are not relevant for teacher edit, but schema requires them if role is student
        admissionId: undefined, enableBusTransport: false, busRouteLocation: undefined, busClassCategory: undefined,
        fatherName: undefined, motherName: undefined, dob: undefined, section: undefined, rollNo: undefined, examNo: undefined, aadharNo: undefined
    },
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
        } else {
          setAuthUser(null);
          toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin." });
        }
      } catch (e) { setAuthUser(null); }
    } else { setAuthUser(null); }
  }, [toast]);

  const fetchInitialData = useCallback(async () => {
    if (!authUser || !authUser.schoolId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [schoolResult, usersResult, classesResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString()),
        getSchoolClasses(authUser.schoolId.toString()) 
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
        setSchoolDetails(null);
      }
      
      if (usersResult.success && usersResult.users) {
        setAllSchoolTeachers(usersResult.users.filter(u => u.role === 'teacher'));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load teachers." });
        setAllSchoolTeachers([]);
      }

      if (classesResult.success && classesResult.classes) {
        setManagedClasses(classesResult.classes);
      } else {
        toast({ variant: "warning", title: "Class List Error", description: classesResult.message || "Failed to load managed class list." });
        setManagedClasses([]);
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId) fetchInitialData();
    else { setIsLoadingData(false); setAllSchoolTeachers([]); setSchoolDetails(null); setManagedClasses([]); }
  }, [authUser, fetchInitialData]);

  useEffect(() => {
    if (editingTeacher) {
      editForm.reset({
        name: editingTeacher.name || "",
        email: editingTeacher.email || "",
        password: "", 
        role: 'teacher', // Role is fixed for this page
        classId: editingTeacher.classId || "", 
      });
    } else {
      editForm.reset({ 
        name: "", email: "", password: "", role: 'teacher', classId: ""
      });
    }
  }, [editingTeacher, editForm]);

  async function handleTeacherSubmit(values: CreateTeacherFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmittingTeacher(true);
    const payload: CreateSchoolUserServerActionFormData = { 
        ...values, 
        role: 'teacher', 
    };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
    setIsSubmittingTeacher(false);
    if (result.success) {
      toast({ title: "Teacher Created", description: result.message });
      teacherForm.reset();
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }
  
  async function handleEditSubmit(values: UpdateSchoolUserFormData) {
    if (!authUser?.schoolId || !editingTeacher?._id) return;
    setIsSubmittingEdit(true);
    const payload = { 
      ...values, 
      role: 'teacher' as 'teacher', // Explicitly set role
      classId: values.classId === NONE_CLASS_VALUE ? "" : values.classId, 
    };
    const result = await updateSchoolUser(editingTeacher._id.toString(), authUser.schoolId.toString(), payload);
    setIsSubmittingEdit(false);
    if (result.success) {
      toast({ title: "Teacher Updated", description: result.message });
      setEditingTeacher(null);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  }

  const handleEditClick = (teacher: SchoolTeacher) => { setEditingTeacher(teacher); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => setEditingTeacher(null);
  const handleDeleteClick = (teacher: SchoolTeacher) => setTeacherToDelete(teacher);

  const handleConfirmDelete = async () => {
    if (!teacherToDelete?._id || !authUser?.schoolId) return;
    setIsDeleting(true);
    const result = await deleteSchoolUser(teacherToDelete._id.toString(), authUser.schoolId.toString());
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "Teacher Deleted", description: result.message });
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error || result.message });
    }
    setTeacherToDelete(null);
  };
  
  const filteredTeachers = allSchoolTeachers.filter(user => 
    Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getClassNameFromId = (classId: string | undefined): string => {
    if (!classId) return 'N/A';
    const foundClass = managedClasses.find(cls => cls._id === classId);
    return foundClass?.name ? `${foundClass.name}${foundClass.section ? ` - ${foundClass.section}`: ''}` : 'N/A (Invalid ID)';
  };

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
            <Briefcase className="mr-2 h-6 w-6" /> Teacher Management
          </CardTitle>
          <CardDescription>
            Manage teacher accounts for {schoolDetails?.schoolName || "your school"}.
          </CardDescription>
        </CardHeader>
      </Card>

      {editingTeacher ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Edit3 className="mr-2 h-5 w-5"/>Edit Teacher: {editingTeacher.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} disabled={isSubmittingEdit} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmittingEdit} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmittingEdit} /></FormControl>
                        <FormDescription className="text-xs">Leave blank to keep current password.</FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField 
                      control={editForm.control} 
                      name="classId" 
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Assign as Class Teacher (Optional)</FormLabel>
                              <Select 
                                  onValueChange={(value) => field.onChange(value === NONE_CLASS_VALUE ? "" : value)}
                                  value={field.value || ""} 
                                  disabled={isSubmittingEdit || managedClasses.length === 0}
                              >
                                  <FormControl><SelectTrigger>
                                      <SelectValue placeholder={managedClasses.length > 0 ? "Select class" : "No classes available"} />
                                  </SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value={NONE_CLASS_VALUE}>-- None --</SelectItem>
                                      {managedClasses.map((cls) => (
                                          <SelectItem key={cls._id} value={cls._id.toString()}>{cls.name} {cls.section ? `- ${cls.section}` : ''}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">Assigning here makes them the primary class teacher for attendance.</FormDescription>
                              {managedClasses.length === 0 && <FormDescription className="text-xs">No classes created yet. Please create classes in Class Management first.</FormDescription>}
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmittingEdit || isLoadingData}>
                    {isSubmittingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                    Update Teacher
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSubmittingEdit}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
            <CardHeader><CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5"/>Add New Teacher</CardTitle></CardHeader>
            <CardContent>
                <Form {...teacherForm}>
                <form onSubmit={teacherForm.handleSubmit(handleTeacherSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={teacherForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Teacher" {...field} disabled={isSubmittingTeacher}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={teacherForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="teacher@example.com" {...field} disabled={isSubmittingTeacher}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={teacherForm.control} name="password" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmittingTeacher}/></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmittingTeacher || isLoadingData}>{isSubmittingTeacher ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}Add Teacher</Button>
                </form>
                </Form>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Teacher List ({schoolDetails?.schoolName || "Your School"})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search teachers..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoadingData || !allSchoolTeachers.length}/>
              <Button variant="outline" size="icon" disabled={isLoadingData || !allSchoolTeachers.length}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading teachers...</p></div>
          ) : filteredTeachers.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Class Teacher For</TableHead><TableHead>Date Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher._id?.toString()}>
                  <TableCell>{teacher.name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{getClassNameFromId(teacher.classId)}</TableCell>
                  <TableCell>{teacher.createdAt ? format(new Date(teacher.createdAt as string), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(teacher)} disabled={isSubmittingTeacher || isSubmittingEdit || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog open={teacherToDelete?._id === teacher._id} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(teacher)} disabled={isSubmittingTeacher || isSubmittingEdit || isDeleting}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      {teacherToDelete && teacherToDelete._id === teacher._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>Delete <span className="font-semibold">{teacherToDelete.name} ({teacherToDelete.email})</span>?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setTeacherToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
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
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No teachers match search." : "No teachers found for this school."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
