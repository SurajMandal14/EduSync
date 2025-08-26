
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Edit3, Trash2, Search, Loader2, UserPlus, BookUser, XCircle, SquarePen, DollarSign, Bus, Info, CalendarIcon, UploadCloud, Upload } from "lucide-react";
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
import { createSchoolUser, getSchoolUsers, updateSchoolUser, deleteSchoolUser, deleteBulkSchoolUsers } from "@/app/actions/schoolUsers";
import { 
    createStudentFormSchema, type CreateStudentFormData,
    updateSchoolUserFormSchema, type UpdateSchoolUserFormData,
    type CreateSchoolUserServerActionFormData
} from '@/types/user';
import { getSchoolById } from "@/app/actions/schools";
import { getClassesForSchoolAsOptions } from "@/app/actions/classes";
import type { User as AppUser } from "@/types/user";
import type { School, TermFee } from "@/types/school";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format } from 'date-fns';
import type { AuthUser } from "@/types/attendance";
import Link from "next/link";
import { Label } from "@/components/ui/label";

type SchoolStudent = Partial<AppUser>; 

const NONE_CLASS_VALUE = "__NONE_CLASS_ID__"; 

interface ClassOption {
  value: string; // class _id
  label: string; // "ClassName - Section"
  name?: string; // Original class name
  section?: string; // Original section
}

export default function AdminStudentManagementPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null); 
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [allSchoolStudents, setAllSchoolStudents] = useState<SchoolStudent[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingStudent, setEditingStudent] = useState<SchoolStudent | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [studentToDelete, setStudentToDelete] = useState<SchoolStudent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});

  const [calculatedTuitionFee, setCalculatedTuitionFee] = useState<number | null>(null);
  const [noTuitionFeeStructureFound, setNoTuitionFeeStructureFound] = useState(false);
  const [calculatedBusFee, setCalculatedBusFee] = useState<number | null>(null);
  const [noBusFeeStructureFound, setNoBusFeeStructureFound] = useState(false);
  const [selectedBusLocations, setSelectedBusLocations] = useState<string[]>([]);
  const [availableBusClassCategories, setAvailableBusClassCategories] = useState<string[]>([]);
  
  const addFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const [addPreview, setAddPreview] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);


  const form = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: { 
        name: "", email: "", password: "", admissionId: "", classId: "", 
        enableBusTransport: false, busRouteLocation: "", busClassCategory: "",
        fatherName: "", motherName: "", dob: "", section: "", rollNo: "",
        symbolNo: "", registrationNo: "", district: "", gender: "", quota: "", avatarUrl: ""
    },
  });

  const editForm = useForm<UpdateSchoolUserFormData>({
    resolver: zodResolver(updateSchoolUserFormSchema),
    defaultValues: { 
        name: "", email: "", password: "", role: 'student', classId: "", admissionId: "", 
        enableBusTransport: false, busRouteLocation: "", busClassCategory: "",
        fatherName: "", motherName: "", dob: "", section: "", rollNo: "", aadharNo: "",
        symbolNo: "", registrationNo: "", district: "", gender: "", quota: "", avatarUrl: ""
    },
  });
  const editEnableBusTransport = editForm.watch("enableBusTransport");


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
      const [schoolResult, usersResult, classesOptionsResult] = await Promise.all([
        getSchoolById(authUser.schoolId.toString()),
        getSchoolUsers(authUser.schoolId.toString()),
        getClassesForSchoolAsOptions(authUser.schoolId.toString()) 
      ]);

      if (schoolResult.success && schoolResult.school) {
        setSchoolDetails(schoolResult.school);
        const uniqueLocations = Array.from(new Set(schoolResult.school.busFeeStructures?.map(bfs => bfs.location) || []));
        setSelectedBusLocations(uniqueLocations.filter(Boolean) as string[]);
      } else {
        toast({ variant: "destructive", title: "Error", description: schoolResult.message || "Failed to load school details." });
        setSchoolDetails(null);
        setSelectedBusLocations([]);
      }
      
      if (usersResult.success && usersResult.users) {
        setAllSchoolStudents(usersResult.users.filter(u => u.role === 'student'));
      } else {
        toast({ variant: "destructive", title: "Error", description: usersResult.message || "Failed to load students." });
        setAllSchoolStudents([]);
      }

      setClassOptions(classesOptionsResult);
      if (classesOptionsResult.length === 0) {
         toast({ variant: "info", title: "No Classes", description: "No classes found. Please create classes in Class Management first." });
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Unexpected error fetching data." });
    } finally {
      setIsLoadingData(false);
    }
  }, [authUser, toast]);

  useEffect(() => {
    if (authUser?.schoolId) fetchInitialData();
    else { setIsLoadingData(false); setAllSchoolStudents([]); setSchoolDetails(null); setClassOptions([]); }
  }, [authUser, fetchInitialData]);

  const calculateAnnualFeeFromTerms = useCallback((terms: TermFee[]): number => {
    return terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);
  
  const selectedClassIdForTuition = form.watch("classId");
  useEffect(() => {
    setNoTuitionFeeStructureFound(false);
    if (selectedClassIdForTuition && selectedClassIdForTuition !== NONE_CLASS_VALUE && schoolDetails?.tuitionFees && classOptions.length > 0) {
      const selectedClassOption = classOptions.find(cls => cls.value === selectedClassIdForTuition);
      if (selectedClassOption && selectedClassOption.name) {
        const feeConfig = schoolDetails.tuitionFees.find(tf => tf.className === selectedClassOption.name);
        if (feeConfig?.terms) {
          setCalculatedTuitionFee(calculateAnnualFeeFromTerms(feeConfig.terms));
        } else {
          setCalculatedTuitionFee(0); 
          setNoTuitionFeeStructureFound(true);
        }
      } else {
        setCalculatedTuitionFee(null);
      }
    } else {
      setCalculatedTuitionFee(null);
    }
  }, [selectedClassIdForTuition, schoolDetails, classOptions, calculateAnnualFeeFromTerms]);

  const studentFormEnableBus = form.watch("enableBusTransport");
  const studentFormBusLocation = form.watch("busRouteLocation");
  const studentFormBusCategory = form.watch("busClassCategory");

  useEffect(() => {
    if (studentFormEnableBus && studentFormBusLocation && schoolDetails?.busFeeStructures) {
      const categories = schoolDetails.busFeeStructures
        .filter(bfs => bfs.location === studentFormBusLocation)
        .map(bfs => bfs.classCategory)
        .filter(Boolean) as string[];
      setAvailableBusClassCategories(Array.from(new Set(categories)));
      if (!categories.includes(form.getValues("busClassCategory"))) {
        form.setValue("busClassCategory", ""); 
      }
    } else {
      setAvailableBusClassCategories([]);
      if (!studentFormEnableBus) { 
         form.setValue("busRouteLocation", "");
      }
      form.setValue("busClassCategory", "");
    }
  }, [studentFormEnableBus, studentFormBusLocation, schoolDetails, form]);

  useEffect(() => {
    setNoBusFeeStructureFound(false);
    if (studentFormEnableBus && studentFormBusLocation && studentFormBusCategory && schoolDetails?.busFeeStructures) {
      const feeConfig = schoolDetails.busFeeStructures.find(
        bfs => bfs.location === studentFormBusLocation && bfs.classCategory === studentFormBusCategory
      );
      if (feeConfig?.terms) {
        setCalculatedBusFee(calculateAnnualFeeFromTerms(feeConfig.terms));
      } else {
        setCalculatedBusFee(0);
        setNoBusFeeStructureFound(true);
      }
    } else {
      setCalculatedBusFee(null);
    }
  }, [studentFormEnableBus, studentFormBusLocation, studentFormBusCategory, schoolDetails, calculateAnnualFeeFromTerms]);

  const handleClassChange = (classIdValue: string, isEditForm: boolean) => {
    const targetForm = isEditForm ? editForm : form;
    targetForm.setValue('classId', classIdValue === NONE_CLASS_VALUE ? "" : classIdValue);
    const selectedClass = classOptions.find(opt => opt.value === classIdValue);
    targetForm.setValue('section', selectedClass?.section || '');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, formType: 'add' | 'edit') => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: "destructive", title: "File Too Large", description: "Please upload an image smaller than 2MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if(formType === 'add') {
            form.setValue('avatarUrl', dataUrl, { shouldValidate: true, shouldDirty: true });
            setAddPreview(dataUrl);
        } else {
            editForm.setValue('avatarUrl', dataUrl, { shouldValidate: true, shouldDirty: true });
            setEditPreview(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  useEffect(() => {
    if (editingStudent) {
      editForm.reset({
        name: editingStudent.name || "",
        email: editingStudent.email || "",
        password: "", 
        role: 'student', 
        classId: editingStudent.classId || "", 
        admissionId: editingStudent.admissionId || "",
        enableBusTransport: !!editingStudent.busRouteLocation,
        busRouteLocation: editingStudent.busRouteLocation || "",
        busClassCategory: editingStudent.busClassCategory || "",
        fatherName: editingStudent.fatherName || "",
        motherName: editingStudent.motherName || "",
        dob: editingStudent.dob ? format(new Date(editingStudent.dob), 'yyyy-MM-dd') : "",
        section: editingStudent.section || "",
        rollNo: editingStudent.rollNo || "",
        aadharNo: editingStudent.aadharNo || "",
        symbolNo: editingStudent.symbolNo || "",
        registrationNo: editingStudent.registrationNo || "",
        district: editingStudent.district || "",
        gender: editingStudent.gender || "",
        quota: editingStudent.quota || "",
        avatarUrl: editingStudent.avatarUrl || "",
      });
      setEditPreview(editingStudent.avatarUrl || null);
      setShowAddForm(false);
    }
  }, [editingStudent, editForm]);

  async function handleStudentSubmit(values: CreateStudentFormData) {
    if (!authUser?.schoolId) return;
    setIsSubmitting(true);
    const payload: CreateSchoolUserServerActionFormData = { 
        ...values, 
        role: 'student', 
        classId: values.classId === NONE_CLASS_VALUE ? undefined : values.classId,
        busRouteLocation: values.enableBusTransport ? values.busRouteLocation : undefined,
        busClassCategory: values.enableBusTransport ? values.busClassCategory : undefined,
    };
    const result = await createSchoolUser(payload, authUser.schoolId.toString());
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Student Created", description: result.message });
      form.reset();
      setCalculatedTuitionFee(null);
      setNoTuitionFeeStructureFound(false);
      setCalculatedBusFee(null);
      setNoBusFeeStructureFound(false);
      setAddPreview(null);
      setShowAddForm(false);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error || result.message });
    }
  }
  
  async function handleEditSubmit(values: UpdateSchoolUserFormData) {
    if (!authUser?.schoolId || !editingStudent?._id) return;
    setIsSubmitting(true);
    const result = await updateSchoolUser(editingStudent._id.toString(), authUser.schoolId.toString(), values);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Student Updated", description: result.message });
      setEditingStudent(null);
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Update Failed", description: result.error || result.message });
    }
  }

  const handleEditClick = (student: SchoolStudent) => { setEditingStudent(student); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => setEditingStudent(null);
  const handleDeleteClick = (student: SchoolStudent) => setStudentToDelete(student);

  const handleConfirmDelete = async () => {
    if (!studentToDelete?._id || !authUser?.schoolId) return;
    setIsDeleting(true);
    const result = await deleteSchoolUser(studentToDelete._id.toString(), authUser.schoolId.toString());
    setIsDeleting(false);
    if (result.success) {
      toast({ title: "Student Deleted", description: result.message });
      fetchInitialData(); 
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error || result.message });
    }
    setStudentToDelete(null);
  };

  const handleBulkDelete = async () => {
    if (!authUser?.schoolId) return;
    const idsToDelete = Object.keys(selectedStudentIds).filter(id => selectedStudentIds[id]);
    if (idsToDelete.length === 0) {
      toast({ variant: 'info', title: 'No Students Selected', description: 'Please select students to delete.' });
      return;
    }
    setIsDeleting(true);
    const result = await deleteBulkSchoolUsers(idsToDelete, authUser.schoolId);
    setIsDeleting(false);
    if (result.success) {
      toast({ title: 'Bulk Delete Successful', description: result.message });
      setSelectedStudentIds({});
      fetchInitialData();
    } else {
      toast({ variant: 'destructive', title: 'Bulk Delete Failed', description: result.error || result.message });
    }
  };
  
  const filteredStudents = allSchoolStudents.filter(user => 
    Object.values(user).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedStudentsCount = useMemo(() => Object.values(selectedStudentIds).filter(Boolean).length, [selectedStudentIds]);

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === 'indeterminate') return;
    const newSelections: Record<string, boolean> = {};
    if (checked) {
      filteredStudents.forEach(student => {
        if (student._id) newSelections[student._id.toString()] = true;
      });
    }
    setSelectedStudentIds(newSelections);
  };

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => s._id && selectedStudentIds[s._id.toString()]);
  const someFilteredSelected = selectedStudentsCount > 0 && !allFilteredSelected;
  const selectAllState = allFilteredSelected ? true : (someFilteredSelected ? 'indeterminate' : false);


  const getClassNameFromId = (classId: string | undefined): string => {
    if (!classId) return 'N/A';
    const foundClass = classOptions.find(cls => cls.value === classId);
    return foundClass?.label || 'N/A (Invalid ID)';
  };

  const openAddForm = () => {
    setEditingStudent(null);
    setShowAddForm(true);
  }

  const cancelAddForm = () => {
    setShowAddForm(false);
    form.reset();
    setAddPreview(null);
  }

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
            <BookUser className="mr-2 h-6 w-6" /> Student Management
          </CardTitle>
          <CardDescription>
            Manage student accounts for {schoolDetails?.schoolName || "your school"}.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {!editingStudent && !showAddForm && (
        <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={openAddForm}>
              <UserPlus className="mr-2 h-4 w-4" /> Add New Student
            </Button>
            <Button asChild variant="outline">
                <Link href="/dashboard/admin/students/import"><UploadCloud className="mr-2 h-4 w-4"/>Bulk Import Students</Link>
            </Button>
            {selectedStudentsCount > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedStudentsCount}) Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the {selectedStudentsCount} selected student(s). This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Delete Selected Students
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      )}

      {editingStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Edit3 className="mr-2 h-5 w-5"/>Edit Student: {editingStudent.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6">
                {/* Edit Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Student Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="fatherName" render={({ field }) => (
                      <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="motherName" render={({ field }) => (
                      <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="dob" render={({ field }) => (
                      <FormItem><FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Date of Birth</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                   <FormField control={editForm.control} name="symbolNo" render={({ field }) => (
                      <FormItem><FormLabel>Symbol No.</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="registrationNo" render={({ field }) => (
                      <FormItem><FormLabel>Registration No.</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="district" render={({ field }) => (
                      <FormItem><FormLabel>District</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="gender" render={({ field }) => (
                      <FormItem><FormLabel>Gender</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                   <FormField control={editForm.control} name="quota" render={({ field }) => (
                      <FormItem><FormLabel>Quota</FormLabel><FormControl><Input {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={editForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} /></FormControl>
                        <FormDescription className="text-xs">Leave blank to keep current password.</FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}/>
                  <FormItem>
                     <Label>Profile Photo</Label>
                     <div className="flex items-center gap-4">
                        <img src={editPreview || 'https://placehold.co/80x80.png'} alt="Avatar Preview" className="h-20 w-20 rounded-md object-cover border" data-ai-hint="profile avatar"/>
                        <Button type="button" variant="outline" onClick={() => editFileRef.current?.click()}><Upload className="mr-2 h-4 w-4"/> Change</Button>
                        <Input type="file" ref={editFileRef} className="sr-only" onChange={(e) => handleFileChange(e, 'edit')} accept="image/*"/>
                     </div>
                  </FormItem>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting || isLoadingData}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
                    Update Student
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isSubmitting}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {showAddForm && !editingStudent && (
        <Card>
            <CardHeader><CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5"/>Add New Student</CardTitle></CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleStudentSubmit)} className="space-y-6">
                 {/* Add Form Fields */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Student Name*</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="dob" render={({ field }) => (
                        <FormItem><FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4"/>Date of Birth*</FormLabel><FormControl><Input type="date" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="fatherName" render={({ field }) => (
                        <FormItem><FormLabel>Father's Name*</FormLabel><FormControl><Input placeholder="e.g., Robert Doe" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="motherName" render={({ field }) => (
                        <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input placeholder="e.g., Mary Doe" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="symbolNo" render={({ field }) => (<FormItem><FormLabel>Symbol No.*</FormLabel><FormControl><Input placeholder="e.g., 115520" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="registrationNo" render={({ field }) => (<FormItem><FormLabel>Registration No.*</FormLabel><FormControl><Input placeholder="e.g., 81830100660" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    
                    <FormField control={form.control} name="district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><FormControl><Input placeholder="e.g., Kaski" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="quota" render={({ field }) => (<FormItem><FormLabel>Quota</FormLabel><FormControl><Input placeholder="e.g., Full Paying" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                    
                    <FormItem>
                         <Label>Profile Photo</Label>
                         <div className="flex items-center gap-4">
                            <img src={addPreview || 'https://placehold.co/80x80.png'} alt="Avatar Preview" className="h-20 w-20 rounded-md object-cover border" data-ai-hint="profile avatar"/>
                            <Button type="button" variant="outline" onClick={() => addFileRef.current?.click()}><Upload className="mr-2 h-4 w-4"/> Upload Photo</Button>
                            <Input type="file" ref={addFileRef} className="sr-only" onChange={(e) => handleFileChange(e, 'add')} accept="image/*"/>
                         </div>
                    </FormItem>

                    <div className="md:col-span-2 border-t pt-6 space-y-6">
                        <h3 className="font-medium text-lg">Portal Credentials & Class</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password*</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="admissionId" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><SquarePen className="mr-2 h-4 w-4"/>Admission ID</FormLabel><FormControl><Input placeholder="e.g., S1001" {...field} disabled={isSubmitting}/></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="classId" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>Assign to Class*</FormLabel>
                                    <Select 
                                        onValueChange={(value) => handleClassChange(value, false)}
                                        value={field.value || ""} 
                                        disabled={isSubmitting || classOptions.length === 0}
                                    >
                                        <FormControl><SelectTrigger>
                                            <SelectValue placeholder={classOptions.length > 0 ? "Select class" : "No classes available"} />
                                        </SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value={NONE_CLASS_VALUE}>-- None --</SelectItem>
                                            {classOptions.map((opt)=>(<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                        </div>
                    </div>
                 </div>
                <div className="flex gap-2">
                    <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || isLoadingData}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}Add Student</Button>
                    <Button type="button" variant="outline" onClick={cancelAddForm} disabled={isSubmitting}>
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
            <CardTitle>Student List ({schoolDetails?.schoolName || "Your School"})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input placeholder="Search students..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoadingData || !allSchoolStudents.length}/>
              <Button variant="outline" size="icon" disabled={isLoadingData || !allSchoolStudents.length}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
             <div className="flex items-center justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading students...</p></div>
          ) : filteredStudents.length > 0 ? (
          <Table>
            <TableHeader><TableRow>
                <TableHead className="w-12"><Checkbox checked={selectAllState} onCheckedChange={handleSelectAllChange} /></TableHead>
                <TableHead>Name</TableHead><TableHead>Registration No.</TableHead><TableHead>Symbol No.</TableHead><TableHead>Class</TableHead><TableHead>Date Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student._id?.toString()} data-state={selectedStudentIds[student._id!] ? "selected" : ""}>
                  <TableCell>
                      <Checkbox
                        checked={!!selectedStudentIds[student._id!]}
                        onCheckedChange={(checked) => setSelectedStudentIds(prev => ({...prev, [student._id!]: !!checked}))}
                        aria-label={`Select student ${student.name}`}
                      />
                  </TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.registrationNo || 'N/A'}</TableCell>
                  <TableCell>{student.symbolNo || 'N/A'}</TableCell>
                  <TableCell>{getClassNameFromId(student.classId)}</TableCell>
                  <TableCell>{student.createdAt ? format(new Date(student.createdAt as string), "PP") : 'N/A'}</TableCell>
                  <TableCell className="space-x-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(student)} disabled={isSubmitting || isDeleting}><Edit3 className="h-4 w-4" /></Button>
                    <AlertDialog open={studentToDelete?._id === student._id} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(student)} disabled={isSubmitting || isDeleting}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      {studentToDelete && studentToDelete._id === student._id && (
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>Delete <span className="font-semibold">{studentToDelete.name} ({studentToDelete.email})</span>?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setStudentToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
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
             <p className="text-center text-muted-foreground py-4">{searchTerm ? "No students match search." : "No students found for this school."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
