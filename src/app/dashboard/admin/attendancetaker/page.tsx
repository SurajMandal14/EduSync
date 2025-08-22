
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Loader2, UserPlus, BookCopy, XCircle, Settings } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { createSchoolUser, getSchoolUsers, updateSchoolUser, deleteSchoolUser } from "@/app/actions/schoolUsers";
import { 
    createAttendanceTakerFormSchema,
    updateAttendanceTakerFormSchema,
    type CreateAttendanceTakerFormData,
    type UpdateAttendanceTakerFormData,
    type CreateSchoolUserServerActionFormData,
} from '@/types/user';
import { getClassesForSchoolAsOptions } from "@/app/actions/classes";
import type { User as AppUser } from "@/types/user";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";

type AttendanceTakerUser = Partial<AppUser>; 
interface ClassOption {
  value: string;
  label: string;
}

export default function AdminAttendanceTakerManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [allAttendanceTakers, setAllAttendanceTakers] = useState<AttendanceTakerUser[]>([]);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingUser, setEditingUser] = useState<AttendanceTakerUser | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [userToDelete, setUserToDelete] = useState<AttendanceTakerUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<CreateAttendanceTakerFormData>({
    resolver: zodResolver(createAttendanceTakerFormSchema),
    defaultValues: { name: "", email: "", password: "", classIds: [] },
  });

  const editForm = useForm<UpdateAttendanceTakerFormData>({
    resolver: zodResolver(updateAttendanceTakerFormSchema),
    defaultValues: { name: "", email: "", password: "", classIds: [] },
  });


  const fetchInitialData = useCallback(async (schoolId: string) => {
    setIsLoading(true);
    try {
      const [usersResult, classesOptionsResult] = await Promise.all([
        getSchoolUsers(schoolId),
        getClassesForSchoolAsOptions(schoolId) 
      ]);

      if (usersResult.success && usersResult.users) {
        setAllAttendanceTakers(usersResult.users.filter(u => u.role === 'attendancetaker'));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load users." });
      }

      setClassOptions(classesOptionsResult);

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoading(false);
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
        classIds: editingUser.classIds || []
      });
      setShowAddForm(false);
    }
  }, [editingUser, editForm]);

  async function handleAddSubmit(values: CreateAttendanceTakerFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmitting(true);
    const payload: CreateSchoolUserServerActionFormData = { ...values, role: 'attendancetaker' };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
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
  
  async function handleEditSubmit(values: UpdateAttendanceTakerFormData) {
    if (!authUser?.schoolId || !editingUser?._id) return;
    setIsSubmitting(true);
    const payload: z.infer<typeof updateAttendanceTakerFormSchema> = { ...values, role: 'attendancetaker' };
    const result = await updateSchoolUser(editingUser._id.toString(), authUser.schoolId.toString(), payload as any);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "User Updated", description: result.message });
      setEditingUser(null);
      fetchInitialData(authUser.schoolId.toString()); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  }

  const handleEditClick = (user: AttendanceTakerUser) => { setEditingUser(user); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => setEditingUser(null);
  const handleDeleteClick = (user: AttendanceTakerUser) => setUserToDelete(user);

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

  const cancelAddForm = () => {
    setShowAddForm(false);
    form.reset();
  }

  const renderClassList = (classIds?: string[]) => {
    if (!classIds || classIds.length === 0) return 'None';
    return classIds.map(id => classOptions.find(opt => opt.value === id)?.label || 'Unknown Class').join(', ');
  }

  const formToShow = editingUser ? editForm : form;
  const submitHandler = editingUser ? handleEditSubmit : handleAddSubmit;
  const formClassIdsField = editingUser ? "classIds" : "classIds";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> Attendance Taker Management
          </CardTitle>
          <CardDescription>
            Manage dedicated attendance taker accounts for your school.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {!editingUser && !showAddForm && (
        <Button onClick={openAddForm}>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Attendance Taker
        </Button>
      )}

      {(showAddForm || editingUser) && (
        <Card>
            <CardHeader><CardTitle className="flex items-center">
              {editingUser ? <Edit3 className="mr-2 h-5 w-5"/> : <UserPlus className="mr-2 h-5 w-5"/>}
              {editingUser ? `Edit: ${editingUser.name}` : "Add New Attendance Taker"}
            </CardTitle></CardHeader>
            <CardContent>
            <Form {...formToShow}>
                <form onSubmit={formToShow.handleSubmit(submitHandler as any)} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={formToShow.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name*</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={formToShow.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={formToShow.control} name="password" render={({ field }) => (<FormItem><FormLabel>{editingUser ? 'New Password' : 'Password*'}</FormLabel><FormControl><Input type="password" {...field} disabled={isSubmitting}/></FormControl><FormDescription>{editingUser ? "Leave blank to keep current password." : ""}</FormDescription><FormMessage /></FormItem>)}/>
                </div>

                <FormField
                  control={formToShow.control}
                  name={formClassIdsField}
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
                          name={formClassIdsField}
                          render={({ field }) => {
                            return (
                              <FormItem key={item.value} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.value)}
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

                <div className="flex gap-2">
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || isLoading}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}{editingUser ? "Update User" : "Add User"}</Button>
                    <Button type="button" variant="outline" onClick={editingUser ? cancelEdit : cancelAddForm} disabled={isSubmitting}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Existing Attendance Takers</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>
          ) : allAttendanceTakers.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Assigned Classes</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {allAttendanceTakers.map((user) => (
                <TableRow key={user._id?.toString()}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="max-w-sm truncate" title={renderClassList(user.classIds)}>{renderClassList(user.classIds)}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(user)} disabled={isSubmitting || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog open={userToDelete?._id === user._id} onOpenChange={(open) => !open && setUserToDelete(null)}>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(user)} disabled={isSubmitting || isDeleting}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      {userToDelete && userToDelete._id === user._id && (
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
             <p className="text-center text-muted-foreground py-4">No attendance takers found for this school.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
