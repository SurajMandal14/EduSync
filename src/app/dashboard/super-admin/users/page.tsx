
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, Building, XCircle } from "lucide-react";
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
import { createSchoolAdmin, getSchoolAdmins, updateSchoolAdmin, deleteSchoolAdmin } from "@/app/actions/adminUsers";
import { getSchools } from "@/app/actions/schools";
import type { SchoolAdminFormData, User } from "@/types/user";
import { schoolAdminFormSchema } from "@/types/user"; 
import type { School } from "@/types/school";
import { useEffect, useState, useCallback } from "react";
import { format } from 'date-fns';

type SchoolAdmin = Partial<User> & { schoolName?: string };

export default function SuperAdminUserManagementPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SchoolAdmin | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<SchoolAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<SchoolAdminFormData>({
    resolver: zodResolver(schoolAdminFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      schoolId: "",
    },
  });

  const fetchAdminsAndSchools = useCallback(async () => {
    setIsLoadingAdmins(true);
    setIsLoadingSchools(true);
    
    const [adminsResult, schoolsResult] = await Promise.all([
      getSchoolAdmins(),
      getSchools()
    ]);

    if (adminsResult.success && adminsResult.admins) {
      setAdmins(adminsResult.admins);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to load admins",
        description: adminsResult.error || "Could not fetch admin data.",
      });
    }
    setIsLoadingAdmins(false);

    if (schoolsResult.success && schoolsResult.schools) {
      setSchools(schoolsResult.schools);
    } else {
      toast({
        variant: "destructive",
        title: "Failed to load schools",
        description: schoolsResult.error || "Could not fetch school list for dropdown.",
      });
    }
    setIsLoadingSchools(false);
  }, [toast]);

  useEffect(() => {
    fetchAdminsAndSchools();
  }, [fetchAdminsAndSchools]);

  useEffect(() => {
    if (editingAdmin) {
      form.reset({
        name: editingAdmin.name || "",
        email: editingAdmin.email || "",
        password: "", // Password field is always cleared for edit
        schoolId: editingAdmin.schoolId?.toString() || "",
      });
    } else {
      form.reset({ // Reset to default when not editing
        name: "",
        email: "",
        password: "",
        schoolId: "",
      });
    }
  }, [editingAdmin, form]);

  async function onSubmit(values: SchoolAdminFormData) {
    setIsSubmitting(true);
    let result;

    if (editingAdmin && editingAdmin._id) {
      result = await updateSchoolAdmin(editingAdmin._id.toString(), values);
    } else {
      result = await createSchoolAdmin(values);
    }
    
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: editingAdmin ? "Admin Updated" : "Admin Created",
        description: result.message,
      });
      handleCancelEdit(); 
      fetchAdminsAndSchools(); 
    } else {
      toast({
        variant: "destructive",
        title: `Error ${editingAdmin ? "Updating" : "Creating"} Admin`,
        description: result.error || result.message,
      });
    }
  }

  const handleEditClick = (admin: SchoolAdmin) => {
    setEditingAdmin(admin);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingAdmin(null);
  };

  const handleDeleteClick = (admin: SchoolAdmin) => {
    setAdminToDelete(admin);
  };

  const handleConfirmDelete = async () => {
    if (!adminToDelete || !adminToDelete._id) return;

    setIsDeleting(true);
    const result = await deleteSchoolAdmin(adminToDelete._id.toString());
    setIsDeleting(false);

    if (result.success) {
      toast({
        title: "Admin Deleted",
        description: result.message,
      });
      fetchAdminsAndSchools(); // Refresh list
    } else {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: result.error || result.message,
      });
    }
    setAdminToDelete(null); // Close dialog
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Users className="mr-2 h-6 w-6" /> School Administrator Management
          </CardTitle>
          <CardDescription>
            {editingAdmin ? `Editing: ${editingAdmin.name}` : "Create and manage administrator accounts for each school."}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingAdmin ? `Edit Admin: ${editingAdmin.name}` : "Add New School Administrator"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane Doe" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@schoolname.com" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                      </FormControl>
                      {editingAdmin && <FormDescription className="text-xs">Leave blank to keep current password.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground" />Assign to School</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || isLoadingSchools}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingSchools ? "Loading schools..." : "Select a school"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schools.map((school) => (
                            <SelectItem key={school._id} value={school._id.toString()}>
                              {school.schoolName}
                            </SelectItem>
                          ))}
                           {schools.length === 0 && !isLoadingSchools && <SelectItem value="no-school" disabled>No schools available</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Button type="submit" className="md:w-auto" disabled={isSubmitting || isLoadingSchools}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? (editingAdmin ? "Updating..." : "Creating...") : (editingAdmin ? "Update Admin" : "Create School Admin")}
                </Button>
                {editingAdmin && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Existing School Administrators</CardTitle>
            {/* <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search admins..." className="w-full sm:max-w-xs" />
              <Button variant="outline" size="icon"><Search className="h-4 w-4" /></Button>
            </div> */}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAdmins ? (
             <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading administrators...</p>
            </div>
          ) : admins.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>School Assigned</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin._id?.toString()}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    {admin.schoolName || (admin.schoolId ? "School ID: "+admin.schoolId.toString().substring(0,8)+"..." : 'N/A')}
                  </TableCell>
                  <TableCell>{admin.createdAt ? format(new Date(admin.createdAt), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(admin)} disabled={isSubmitting || isDeleting}> 
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(admin)} disabled={isSubmitting || isDeleting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      {adminToDelete && adminToDelete._id === admin._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the admin account 
                              for <span className="font-semibold">{adminToDelete.name} ({adminToDelete.email})</span>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setAdminToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isDeleting ? "Deleting..." : "Yes, delete admin"}
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
             <p className="text-center text-muted-foreground py-4">No school administrators found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
