
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, XCircle, Briefcase, BookCopy } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
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
    updateSchoolUserFormSchema,
    type UpdateSchoolUserFormData,
    createSchoolUserFormSchema,
    type CreateSchoolUserFormData,
} from '@/types/user';
import { getClassesForSchoolAsOptions } from "@/app/actions/classes";
import type { User as AppUser, UserRole } from "@/types/user";
import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";
import Link from "next/link";

type SchoolStaff = Partial<AppUser>; 
interface ClassOption {
  value: string;
  label: string;
}

export default function AdminStaffManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [allSchoolStaff, setAllSchoolStaff] = useState<SchoolStaff[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingUser, setEditingUser] = useState<SchoolStaff | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [userToDelete, setUserToDelete] = useState<SchoolStaff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<CreateSchoolUserFormData>({
    resolver: zodResolver(createSchoolUserFormSchema),
    defaultValues: { name: "", email: "", password: "", role: "teacher", classIds: [] },
  });

  const editForm = useForm<UpdateSchoolUserFormData>({
    resolver: zodResolver(updateSchoolUserFormSchema),
    defaultValues: { name: "", email: "", password: "", role: "teacher", classIds: [] },
  });
  
  const formRole = form.watch("role");
  const editFormRole = editForm.watch("role");


  const fetchInitialData = useCallback(async (schoolId: string) => {
    setIsLoadingData(true);
    try {
      const [usersResult, classesOptionsResult] = await Promise.all([
        getSchoolUsers(schoolId),
        getClassesForSchoolAsOptions(schoolId) 
      ]);

      if (usersResult.success && usersResult.users) {
        setAllSchoolStaff(usersResult.users.filter(u => u.role === 'teacher' || u.role === 'attendancetaker'));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load users." });
      }

      setClassOptions(classesOptionsResult);

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
          setAuthUser(parsedUser);
          fetchInitialData(parsedUser.schoolId.toString());
        } else {
          setAuthUser(null);
        }
      } catch (e) { setAuthUser(null); }
    } else { setAuthUser(null); }
  }, [toast, fetchInitialData]);

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        name: editingUser.name || "",
        email: editingUser.email || "",
        password: "",
        role: editingUser.role as UserRole,
        classIds: editingUser.classIds || [],
      });
      setShowAddForm(true);
    } else {
      setShowAddForm(false);
    }
  }, [editingUser, editForm]);

  async function handleAddSubmit(values: CreateSchoolUserFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmitting(true);
    const result = await createSchoolUser(values, authUser.schoolId.toString());
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "User Created", description: result.message });
      form.reset();
      setShowAddForm(false);
      fetchInitialData(authUser.schoolId.toString()); 
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }
  
  async function handleEditSubmit(values: UpdateSchoolUserFormData) {
    if (!authUser?.schoolId || !editingUser?._id) return;
    setIsSubmitting(true);
    const result = await updateSchoolUser(editingUser._id.toString(), authUser.schoolId.toString(), values);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "User Updated", description: result.message });
      setEditingUser(null);
      fetchInitialData(authUser.schoolId.toString()); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  }

  const handleEditClick = (user: SchoolStaff) => { setEditingUser(user); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelForm = () => { setEditingUser(null); setShowAddForm(false); form.reset(); editForm.reset(); };
  const handleDeleteClick = (user: SchoolStaff) => setUserToDelete(user);

  const handleConfirmDelete = async () => {
    if (!userToDelete?._id || !authUser?.schoolId) return;
    setIsDeleting(true);
    const result = await deleteSchoolUser(userToDelete._id.toString(), authUser.schoolId.toString());
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "User Deleted", description: result.message });
      fetchInitialData(authUser.schoolId.toString()); 
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error || result.message });
    }
    setUserToDelete(null);
  };
  
  const openAddForm = () => {
    setEditingUser(null);
    setShowAddForm(true);
  }
  
  const filteredStaff = allSchoolStaff.filter(user => 
    Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const renderClassList = (classIds?: string[]) => {
    if (!classIds || classIds.length === 0) return 'None';
    if (classIds.length > 2) return `${classIds.length} classes assigned`;
    return classIds.map(id => classOptions.find(opt => opt.value === id)?.label || 'Unknown Class').join(', ');
  }

  const formToShow = editingUser ? editForm : form;
  const submitHandler = editingUser ? handleEditSubmit : handleAddSubmit;
  const formRoleToShow = editingUser ? editFormRole : formRole;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Briefcase className="mr-2 h-6 w-6" /> Staff Management
          </CardTitle>
          <CardDescription>
            Manage teacher and attendance taker accounts for your school.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {!showAddForm && (
        <Button onClick={openAddForm}>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Staff
        </Button>
      )}

      {showAddForm && (
        <Card>
            <CardHeader><CardTitle className="flex items-center">
              {editingUser ? <Edit3 className="mr-2 h-5 w-5"/> : <UserPlus className="mr-2 h-5 w-5"/>}
              {editingUser ? `Edit: ${editingUser.name}` : "Add New Staff Member"}
            </CardTitle></CardHeader>
            <CardContent>
            <Form {...formToShow}>
                <form onSubmit={formToShow.handleSubmit(submitHandler as any)} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={formToShow.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name*</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={formToShow.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={formToShow.control} name="password" render={({ field }) => (<FormItem><FormLabel>{editingUser ? 'New Password' : 'Password*'}</FormLabel><FormControl><Input type="password" {...field} disabled={isSubmitting}/></FormControl><FormDescription>{editingUser ? "Leave blank to keep current password." : ""}</FormDescription><FormMessage /></FormItem>)}/>
                    <FormField control={formToShow.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="attendancetaker">Attendance Taker</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
                </div>

                {formRoleToShow === 'attendancetaker' && (
                  <FormField
                    control={formToShow.control}
                    name="classIds"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base flex items-center"><BookCopy className="mr-2 h-5 w-5"/>Assign Classes*</FormLabel>
                          <FormDescription>Select all classes this user can mark attendance for.</FormDescription>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {classOptions.map((item) => (
                          <FormField
                            key={item.value}
                            control={formToShow.control}
                            name="classIds"
                            render={({ field }) => {
                              return (
                                <FormItem key={item.value} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={(field.value || []).includes(item.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item.value])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== item.value
                                              )
                                            )
                                      }}
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item.label}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex gap-2">
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || isLoadingData}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}{editingUser ? "Update Staff" : "Add Staff"}</Button>
                    <Button type="button" variant="outline" onClick={cancelForm} disabled={isSubmitting}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>
      )}

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
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Assigned Classes</TableHead><TableHead>Date Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredStaff.map((staff) => (
                <TableRow key={staff._id?.toString()}>
                  <TableCell>{staff.name}</TableCell>
                  <TableCell>{staff.email}</TableCell>
                  <TableCell className="capitalize">{staff.role}</TableCell>
                  <TableCell className="max-w-sm truncate" title={renderClassList(staff.classIds)}>{renderClassList(staff.classIds)}</TableCell>
                  <TableCell>{staff.createdAt ? format(new Date(staff.createdAt as string), "PP") : 'N/A'}</TableCell>
                   <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(staff)} disabled={isSubmitting || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog open={userToDelete?._id === staff._id} onOpenChange={(open) => !open && setUserToDelete(null)}>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(staff)} disabled={isSubmitting || isDeleting}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      {userToDelete && userToDelete._id === staff._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>Delete <span className="font-semibold">{userToDelete.name} ({userToDelete.email})</span>?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
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
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No staff match search." : "No staff found for this school."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
