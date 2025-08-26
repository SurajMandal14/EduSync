
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChartBig, CalendarDays, Loader2, Info, Download, DollarSign, FileText, BadgePercent, Users, ShieldCheck, ShieldOff, UploadCloud, BookOpenCheck, CheckCircle2, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getDailyAttendanceForSchool } from "@/app/actions/attendance";
import type { AttendanceRecord, AuthUser } from "@/types/attendance";
import type { User as AppUser } from "@/types/user";
import type { School, TermFee } from "@/types/school";
import type { FeePayment } from "@/types/fees";
import type { FeeConcession } from "@/types/concessions";
import { getReportCardsForClass, generateAndPublishReportsForClass } from "@/app/actions/reports"; // Added new actions
import type { BulkPublishReportInfo } from "@/types/report"; // Added type
import { getClassesForSchoolAsOptions } from "@/app/actions/classes"; // For class dropdown
import { getSchoolUsers } from "@/app/actions/schoolUsers";
import { getSchoolById } from "@/app/actions/schools";
import { getFeePaymentsBySchool } from "@/app/actions/fees";
import { getFeeConcessionsForSchool } from "@/app/actions/concessions";
import Link from "next/link";

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const getCurrentAcademicYear = (): string => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  if (currentMonth >= 5) {
    return `${currentYear}-${currentYear + 1}`;
  } else {
    return `${currentYear - 1}-${currentYear}`;
  }
};


interface ClassAttendanceSummary {
  className: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
}

interface OverallAttendanceSummary {
    totalStudents: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    overallAttendancePercentage: number;
}

interface ClassFeeSummary {
  className: string;
  totalExpected: number;
  totalCollected: number;
  totalConcessions: number;
  totalDue: number;
  collectionPercentage: number;
}

interface OverallFeeSummary {
  grandTotalExpected: number;
  grandTotalCollected: number;
  grandTotalConcessions: number;
  grandTotalDue: number;
  overallCollectionPercentage: number;
}

interface ClassOption {
  value: string; // class _id
  label: string; // "ClassName - Section"
}


export default function AdminReportsPage() {
  const [reportDate, setReportDate] = useState<Date | undefined>(undefined);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassAttendanceSummary[]>([]);
  const [overallSummary, setOverallSummary] = useState<OverallAttendanceSummary | null>(null);

  const [allSchoolStudents, setAllSchoolStudents] = useState<AppUser[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [allSchoolPayments, setAllSchoolPayments] = useState<FeePayment[]>([]);
  const [allSchoolConcessions, setAllSchoolConcessions] = useState<FeeConcession[]>([]);
  const [feeClassSummaries, setFeeClassSummaries] = useState<ClassFeeSummary[]>([]);
  const [feeOverallSummary, setFeeOverallSummary] = useState<OverallFeeSummary | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingAttendancePdf, setIsDownloadingAttendancePdf] = useState(false);
  const [isDownloadingFeePdf, setIsDownloadingFeePdf] = useState(false);
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [lastFetchedSchoolId, setLastFetchedSchoolId] = useState<string | null>(null);
  const currentAcademicYear = getCurrentAcademicYear();

  // States for Bulk Report Publishing
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassForBulkPublish, setSelectedClassForBulkPublish] = useState<string>("");
  const [academicYearForBulkPublish, setAcademicYearForBulkPublish] = useState<string>(currentAcademicYear);
  const [reportsForBulkPublish, setReportsForBulkPublish] = useState<BulkPublishReportInfo[]>([]);
  const [isLoadingBulkReports, setIsLoadingBulkReports] = useState(false);
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);


  useEffect(() => {
    setReportDate(new Date());

    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.role === 'admin' && parsedUser.schoolId) {
                 setAuthUser(parsedUser);
            } else {
                setAuthUser(null);
                 toast({ variant: "destructive", title: "Access Denied", description: "You must be a school admin." });
            }
        } catch(e) {
            console.error("Failed to parse user from localStorage in AdminReportsPage:", e);
            setAuthUser(null);
            toast({ variant: "destructive", title: "Session Error", description: "Failed to load user data." });
        }
    } else {
      setAuthUser(null);
    }
  }, [toast]);

  const fetchClassOptionsForBulkPublish = useCallback(async () => {
    if (authUser?.schoolId) {
      const options = await getClassesForSchoolAsOptions(authUser.schoolId.toString());
      setClassOptions(options);
    }
  }, [authUser?.schoolId]);

  useEffect(() => {
    fetchClassOptionsForBulkPublish();
  }, [fetchClassOptionsForBulkPublish]);


  const calculateAnnualTuitionFee = useCallback((className: string | undefined, schoolConfig: School | null): number => {
    if (!className || !schoolConfig || !schoolConfig.tuitionFees) return 0;
    const classFeeConfig = schoolConfig.tuitionFees.find(cf => cf.className === className);
    if (!classFeeConfig || !classFeeConfig.terms) return 0;
    return classFeeConfig.terms.reduce((sum, term) => sum + (term.amount || 0), 0);
  }, []);

  const processAttendanceData = useCallback(() => {
    if (allSchoolStudents.length === 0 && attendanceRecords.length === 0) {
      setClassSummaries([]);
      setOverallSummary(null);
      return;
    }
    if (allSchoolStudents.length > 0 && attendanceRecords.length === 0 && reportDate) {
        const summaries: ClassAttendanceSummary[] = allSchoolStudents
            .reduce((acc, student) => {
                if (student.classId) {
                    const classObj = classOptions.find(c => c.value === student.classId);
                    const classNameForSummary = classObj?.label || student.classId;
                    let classGroup = acc.find(g => g.className === classNameForSummary);
                    if (!classGroup) {
                        classGroup = { className: classNameForSummary, students: [] };
                        acc.push(classGroup);
                    }
                    classGroup.students.push(student);
                }
                return acc;
            }, [] as { className: string; students: AppUser[] }[])
            .map(group => ({
                className: group.className,
                totalStudents: group.students.length,
                present: 0,
                absent: group.students.length,
                late: 0,
                attendancePercentage: 0,
            }))
            .sort((a, b) => a.className.localeCompare(b.className));

        setClassSummaries(summaries);
        setOverallSummary({
            totalStudents: allSchoolStudents.length,
            totalPresent: 0,
            totalAbsent: allSchoolStudents.length,
            totalLate: 0,
            overallAttendancePercentage: 0,
        });
        return;
    }

    const classMap = new Map<string, { students: AppUser[], present: number, absent: number, late: number }>();

    allSchoolStudents.forEach(student => {
      if (student.classId) {
        const classObj = classOptions.find(c => c.value === student.classId);
        const classNameForSummary = classObj?.label || student.classId;
        if (!classMap.has(classNameForSummary)) {
          classMap.set(classNameForSummary, { students: [], present: 0, absent: 0, late: 0 });
        }
        classMap.get(classNameForSummary)!.students.push(student);
      }
    });

    attendanceRecords.forEach(record => {
      const classObj = classOptions.find(c => c.value === record.classId.toString()); // classId from attendance is ObjectId string
      const classNameForSummary = classObj?.label || record.className; // Use record.className as fallback if classId mapping fails
      if (classMap.has(classNameForSummary)) {
        const classData = classMap.get(classNameForSummary)!;
        if (record.status === 'present') classData.present++;
        else if (record.status === 'absent') classData.absent++;
        else if (record.status === 'late') classData.late++;
      }
    });

    let totalSchoolStudents = 0;
    let totalSchoolPresent = 0;
    let totalSchoolAbsent = 0;
    let totalSchoolLate = 0;

    const summaries: ClassAttendanceSummary[] = [];
    for (const [className, data] of classMap.entries()) {
      const totalStudentsInClass = data.students.length;
      const markedStudentsCount = data.present + data.absent + data.late;
      const unmarkedAsAbsent = totalStudentsInClass - markedStudentsCount;

      const actualPresent = data.present;
      const actualLate = data.late;
      const actualAbsent = data.absent + (unmarkedAsAbsent > 0 ? unmarkedAsAbsent : 0) ;

      const attendedInClass = actualPresent + actualLate;
      const attendancePercentage = totalStudentsInClass > 0 ? Math.round((attendedInClass / totalStudentsInClass) * 100) : 0;

      summaries.push({
        className,
        totalStudents: totalStudentsInClass,
        present: actualPresent,
        absent: actualAbsent,
        late: actualLate,
        attendancePercentage,
      });

      totalSchoolStudents += totalStudentsInClass;
      totalSchoolPresent += actualPresent;
      totalSchoolAbsent += actualAbsent;
      totalSchoolLate += actualLate;
    }

    const overallAttended = totalSchoolPresent + totalSchoolLate;
    const overallAttendancePercentage = totalSchoolStudents > 0 ? Math.round((overallAttended / totalSchoolStudents) * 100) : 0;

    setOverallSummary({
        totalStudents: totalSchoolStudents,
        totalPresent: totalSchoolPresent,
        totalAbsent: totalSchoolAbsent,
        totalLate: totalSchoolLate,
        overallAttendancePercentage
    });

    setClassSummaries(summaries.sort((a, b) => a.className.localeCompare(b.className)));

  }, [allSchoolStudents, attendanceRecords, reportDate, classOptions]);


 const processFeeData = useCallback(() => {
    if (!allSchoolStudents.length || !schoolDetails || !allSchoolPayments) {
      setFeeClassSummaries([]);
      setFeeOverallSummary(null);
      return;
    }

    let grandTotalExpected = 0;
    let grandTotalCollected = 0;
    let grandTotalConcessions = 0;

    const classFeeMap = new Map<string, { totalExpected: number, totalCollected: number, totalConcessions: number, studentCount: number }>();

    allSchoolStudents.forEach(student => {
      if (student.classId) {
        const classObj = classOptions.find(c => c.value === student.classId);
        const classNameForSummary = (classObj as any)?.name || student.classId; // Use original class name for tuition fee lookup
        const displayClassName = classObj?.label || student.classId; // Use label for display

        const studentTotalAnnualTuitionFee = calculateAnnualTuitionFee(classNameForSummary, schoolDetails);
        const studentPayments = allSchoolPayments.filter(p => p.studentId.toString() === student._id.toString());
        const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);

        const studentConcessionsForYear = allSchoolConcessions.filter(
            c => c.studentId.toString() === student._id.toString() && c.academicYear === currentAcademicYear
        );
        const studentTotalConcessions = studentConcessionsForYear.reduce((sum, c) => sum + c.amount, 0);

        grandTotalExpected += studentTotalAnnualTuitionFee;
        grandTotalCollected += studentTotalPaid;
        grandTotalConcessions += studentTotalConcessions;

        if (!classFeeMap.has(displayClassName)) {
          classFeeMap.set(displayClassName, { totalExpected: 0, totalCollected: 0, totalConcessions: 0, studentCount: 0 });
        }
        const classData = classFeeMap.get(displayClassName)!;
        classData.totalExpected += studentTotalAnnualTuitionFee;
        classData.totalCollected += studentTotalPaid;
        classData.totalConcessions += studentTotalConcessions;
        classData.studentCount++;
      }
    });

    const feeSummaries: ClassFeeSummary[] = [];
    for (const [className, data] of classFeeMap.entries()) {
      const netExpectedForClass = data.totalExpected - data.totalConcessions;
      const totalDue = netExpectedForClass - data.totalCollected;
      const collectionPercentage = netExpectedForClass > 0 ? Math.round((data.totalCollected / netExpectedForClass) * 100) : (data.totalCollected > 0 ? 100 : 0);

      feeSummaries.push({
        className,
        totalExpected: data.totalExpected,
        totalCollected: data.totalCollected,
        totalConcessions: data.totalConcessions,
        totalDue,
        collectionPercentage,
      });
    }

    const grandNetExpected = grandTotalExpected - grandTotalConcessions;
    const grandTotalDue = grandNetExpected - grandTotalCollected;
    const overallCollectionPercentage = grandNetExpected > 0 ? Math.round((grandTotalCollected / grandNetExpected) * 100) : (grandTotalCollected > 0 ? 100 : 0);

    setFeeOverallSummary({
      grandTotalExpected,
      grandTotalCollected,
      grandTotalConcessions,
      grandTotalDue,
      overallCollectionPercentage,
    });
    setFeeClassSummaries(feeSummaries.sort((a,b) => a.className.localeCompare(b.className)));

  }, [allSchoolStudents, schoolDetails, allSchoolPayments, allSchoolConcessions, calculateAnnualTuitionFee, currentAcademicYear, classOptions]);


  useEffect(() => {
    processAttendanceData();
  }, [allSchoolStudents, attendanceRecords, processAttendanceData]);

  useEffect(() => {
    processFeeData();
  }, [allSchoolStudents, schoolDetails, allSchoolPayments, allSchoolConcessions, processFeeData]);


  const loadReportData = useCallback(async (isManualRefresh = false) => {
    if (!authUser || !authUser.schoolId) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    let schoolDataFetchedThisRun = false;

    if (isManualRefresh || lastFetchedSchoolId !== authUser.schoolId.toString()) {
      try {
        const [studentsResult, schoolRes, paymentsResult, concessionsResult, classesOptRes] = await Promise.all([
          getSchoolUsers(authUser.schoolId.toString()),
          getSchoolById(authUser.schoolId.toString()),
          getFeePaymentsBySchool(authUser.schoolId.toString()),
          getFeeConcessionsForSchool(authUser.schoolId.toString(), currentAcademicYear),
          getClassesForSchoolAsOptions(authUser.schoolId.toString())
        ]);

        if (classesOptRes) setClassOptions(classesOptRes);

        if (studentsResult.success && studentsResult.users) {
          setAllSchoolStudents(studentsResult.users.filter(u => u.role === 'student'));
        } else {
          toast({ variant: "warning", title: "Student Data", description: studentsResult.message || "Could not fetch student list." });
          setAllSchoolStudents([]);
        }

        if (schoolRes.success && schoolRes.school) {
          setSchoolDetails(schoolRes.school);
        } else {
          toast({ variant: "destructive", title: "School Info Error", description: schoolRes.message || "Could not load school details for reports."});
          setSchoolDetails(null);
        }

        if (paymentsResult.success && paymentsResult.payments) {
          setAllSchoolPayments(paymentsResult.payments);
        } else {
          toast({ variant: "warning", title: "Fee Payment Data", description: paymentsResult.message || "Could not fetch fee payments." });
          setAllSchoolPayments([]);
        }

        if (concessionsResult.success && concessionsResult.concessions) {
            setAllSchoolConcessions(concessionsResult.concessions);
        } else {
            toast({ variant: "warning", title: "Concession Data", description: concessionsResult.message || "Could not fetch concession data." });
            setAllSchoolConcessions([]);
        }

        setLastFetchedSchoolId(authUser.schoolId.toString());
        schoolDataFetchedThisRun = true;
      } catch (error) {
         toast({ variant: "destructive", title: "Error Fetching School Data", description: "An error occurred while fetching school-wide information."});
         console.error("Error fetching school-wide data:", error);
      }
    }

    if (reportDate) {
        try {
            const attendanceResult = await getDailyAttendanceForSchool(authUser.schoolId.toString(), reportDate);
            if (attendanceResult.success && attendanceResult.records) {
                setAttendanceRecords(attendanceResult.records);
                if (attendanceResult.records.length === 0 && allSchoolStudents.length > 0 && (isManualRefresh || schoolDataFetchedThisRun)) {
                    toast({ title: "No Attendance Data", description: "No attendance records found for the selected date." });
                }
            } else {
                toast({ variant: "destructive", title: "Attendance Data Error", description: attendanceResult.error || "Could not fetch attendance data." });
                setAttendanceRecords([]);
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error Fetching Attendance", description: "An error occurred while fetching attendance."});
            console.error("Error fetching attendance data:", error);
            setAttendanceRecords([]);
        }
    } else {
        setAttendanceRecords([]);
    }

    setIsLoading(false);
  }, [authUser, reportDate, toast, lastFetchedSchoolId, allSchoolStudents.length, currentAcademicYear]);

  useEffect(() => {
    if (authUser && authUser.schoolId) {
      loadReportData(false);
    }
  }, [authUser, reportDate, loadReportData]);


  const handleDownloadAttendancePdf = async () => {
    const reportContent = document.getElementById('attendanceReportContent');
    if (!reportContent) {
      toast({ variant: "destructive", title: "Error", description: "Attendance report content not found for PDF generation." });
      return;
    }
    if (!reportDate) {
        toast({ variant: "info", title: "Select Date", description: "Please select a date for the attendance report." });
        return;
    }

    setIsDownloadingAttendancePdf(true);
    try {
      const canvas = await html2canvas(reportContent, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;

      const ratio = imgWidth / imgHeight;
      let newImgWidth = pdfWidth - 20;
      let newImgHeight = newImgWidth / ratio;

      if (newImgHeight > pdfHeight - 20) {
        newImgHeight = pdfHeight - 20;
        newImgWidth = newImgHeight * ratio;
      }

      const x = (pdfWidth - newImgWidth) / 2;
      const y = (pdfHeight - newImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
      pdf.save(`Attendance_Report_${format(reportDate, "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "PDF Error", description: "Could not generate attendance PDF. See console for details."});
    } finally {
      setIsDownloadingAttendancePdf(false);
    }
  };

  const handleDownloadFeePdf = async () => {
    const reportContent = document.getElementById('feeReportContent');
    if (!reportContent) {
      toast({ variant: "destructive", title: "Error", description: "Fee report content not found for PDF generation." });
      return;
    }
     if (!schoolDetails) {
        toast({ variant: "info", title: "Missing Data", description: "School details not loaded, cannot generate fee report PDF." });
        return;
    }

    setIsDownloadingFeePdf(true);
    try {
      const canvas = await html2canvas(reportContent, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;

      const ratio = imgWidth / imgHeight;
      let newImgWidth = pdfWidth - 20;
      let newImgHeight = newImgWidth / ratio;

      if (newImgHeight > pdfHeight - 20) {
        newImgHeight = pdfHeight - 20;
        newImgWidth = newImgHeight * ratio;
      }

      const x = (pdfWidth - newImgWidth) / 2;
      const y = (pdfHeight - newImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
      pdf.save(`Fee_Collection_Report_${schoolDetails.schoolName.replace(/\s+/g, '_')}_${currentAcademicYear}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "PDF Error", description: "Could not generate fee report PDF. See console for details."});
    } finally {
      setIsDownloadingFeePdf(false);
    }
  };

  const handleLoadReportsForBulkPublish = async () => {
    if (!authUser?.schoolId || !selectedClassForBulkPublish || !academicYearForBulkPublish) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please select a class and academic year."});
      setReportsForBulkPublish([]);
      return;
    }
    setIsLoadingBulkReports(true);
    const result = await getReportCardsForClass(authUser.schoolId.toString(), selectedClassForBulkPublish, academicYearForBulkPublish);
    if (result.success && result.reports) {
      setReportsForBulkPublish(result.reports);
      if (result.reports.length === 0) {
        toast({title: "No Students Found", description: "No students found in this class for the selected academic year."});
      }
    } else {
      toast({variant: "destructive", title: "Error Loading Reports", description: result.message || "Could not load report statuses."});
      setReportsForBulkPublish([]);
    }
    setIsLoadingBulkReports(false);
  };

  const handleBulkAction = async (publish: boolean) => {
    if (!authUser?.schoolId || !authUser?._id || !selectedClassForBulkPublish || !academicYearForBulkPublish) {
      toast({ variant: "destructive", title: "Error", description: "Required information is missing to perform this action."});
      return;
    }
    setIsBulkPublishing(true);
    const result = await generateAndPublishReportsForClass(authUser.schoolId.toString(), selectedClassForBulkPublish, academicYearForBulkPublish, authUser._id.toString(), publish);
    if (result.success) {
      toast({ title: "Bulk Action Successful", description: result.message});
      handleLoadReportsForBulkPublish(); // Refresh the list
    } else {
      toast({variant: "destructive", title: "Bulk Action Failed", description: result.message || "Could not perform bulk action."});
    }
    setIsBulkPublishing(false);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <BarChartBig className="mr-2 h-6 w-6" /> School Reports
          </CardTitle>
          <CardDescription>View summaries and reports for school operations. Access report card generation tools. Fee reports are for academic year: {currentAcademicYear}.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Report Card Generation</CardTitle>
            <CardDescription>Select a template to start generating student report cards.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/dashboard/admin/reports/generate-cbse-state" passHref>
                 <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <FileText className="h-6 w-6 mb-1"/>
                    <span>CBSE State Template</span>
                 </Button>
            </Link>
             <Link href="/dashboard/admin/reports/generate-nursing" passHref>
                 <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <FileText className="h-6 w-6 mb-1"/>
                    <span>Nursing College</span>
                 </Button>
            </Link>
            <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center" disabled>
                <FileText className="h-6 w-6 mb-1 text-muted-foreground"/>
                <span className="text-muted-foreground">More Templates (Soon)</span>
            </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Report Card Generation & Publishing</CardTitle>
          <CardDescription>Generate, save, and publish report cards for an entire class at once. This will overwrite any existing reports for the selected year.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow">
              <Label htmlFor="bulk-class-select">Select Class</Label>
              <Select onValueChange={setSelectedClassForBulkPublish} value={selectedClassForBulkPublish} disabled={isLoadingBulkReports || isBulkPublishing || classOptions.length === 0}>
                <SelectTrigger id="bulk-class-select">
                  <SelectValue placeholder={classOptions.length > 0 ? "Select class" : "No classes available"} />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-grow">
              <Label htmlFor="bulk-academic-year">Academic Year</Label>
              <Input id="bulk-academic-year" value={academicYearForBulkPublish} onChange={(e) => setAcademicYearForBulkPublish(e.target.value)} placeholder="YYYY-YYYY" disabled={isLoadingBulkReports || isBulkPublishing}/>
            </div>
            <Button onClick={handleLoadReportsForBulkPublish} disabled={isLoadingBulkReports || isBulkPublishing || !selectedClassForBulkPublish || !academicYearForBulkPublish.match(/^\d{4}-\d{4}$/)}>
              {isLoadingBulkReports ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Users className="mr-2 h-4 w-4"/>} Load Student Status
            </Button>
          </div>

          {reportsForBulkPublish.length > 0 && !isLoadingBulkReports && (
            <div className="space-y-3 mt-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkAction(true)}
                  disabled={isBulkPublishing}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isBulkPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>} Generate & Publish All
                </Button>
                <Button
                  onClick={() => handleBulkAction(false)}
                  disabled={isBulkPublishing}
                  variant="destructive"
                >
                  {isBulkPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldOff className="mr-2 h-4 w-4"/>} Generate & Unpublish All
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Registration No.</TableHead>
                    <TableHead>Report Exists?</TableHead>
                    <TableHead>Current Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsForBulkPublish.map(report => (
                    <TableRow key={report.studentId}>
                      <TableCell>{report.studentName}</TableCell>
                      <TableCell>{report.registrationNo}</TableCell>
                       <TableCell className="text-center">
                        {report.hasReport ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" /> : <XCircleIcon className="h-5 w-5 text-red-500 mx-auto" />}
                      </TableCell>
                      <TableCell>
                        {report.hasReport ? (report.isPublished ?
                          <span className="text-green-600 font-semibold">Published</span> :
                          <span className="text-red-600 font-semibold">Not Published</span>
                        ) : (
                          <span className="text-muted-foreground">No Report</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
           {isLoadingBulkReports && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/> Loading student report statuses...</div>}
           {!isLoadingBulkReports && reportsForBulkPublish.length === 0 && selectedClassForBulkPublish && (
                <p className="text-center text-muted-foreground py-4">No students found for the selected class and year.</p>
            )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <CardTitle>Daily Attendance Summary Report</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-auto">
                        <Label htmlFor="report-date-picker" className="mb-1 block text-sm font-medium">Select Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="report-date-picker"
                                variant={"outline"}
                                className="w-full sm:w-[240px] justify-start text-left font-normal"
                                disabled={isLoading || !authUser || !reportDate}
                            >
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {reportDate ? format(reportDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={reportDate}
                                onSelect={setReportDate}
                                initialFocus
                                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button
                        variant="default"
                        onClick={() => loadReportData(true)}
                        disabled={isLoading || !authUser || !reportDate}
                        className="w-full sm:w-auto"
                    >
                        {isLoading && !isDownloadingAttendancePdf && !isDownloadingFeePdf ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin"/> : <BarChartBig className="mr-0 sm:mr-2 h-4 w-4"/>}
                        <span className="sm:inline hidden">Generate Report</span>
                        <span className="sm:hidden inline">Generate</span>
                    </Button>
                     <Button
                        variant="outline"
                        onClick={handleDownloadAttendancePdf}
                        disabled={isLoading || isDownloadingAttendancePdf || !authUser || !reportDate || !overallSummary}
                        className="w-full sm:w-auto"
                    >
                        {isDownloadingAttendancePdf ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-0 sm:mr-2 h-4 w-4"/>}
                        <span className="sm:inline hidden">Download PDF</span>
                        <span className="sm:hidden inline">PDF</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading && !isDownloadingAttendancePdf && !isDownloadingFeePdf ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Generating attendance report...</p>
            </div>
          ) : !authUser ? (
             <p className="text-center text-muted-foreground py-4">Please log in as a school admin to view reports.</p>
          ) : !reportDate ? (
             <p className="text-center text-muted-foreground py-4">Please select a date to generate the attendance report.</p>
          ) : classSummaries.length > 0 && overallSummary ? (
            <div id="attendanceReportContent" className="p-4 bg-card rounded-md">
            <Card className="mb-6 bg-secondary/30 border-none shadow-none">
                <CardHeader className="pt-2 pb-2">
                    <CardTitle className="text-lg">Overall School Attendance - {format(reportDate, "PPP")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center pb-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                        <p className="text-2xl font-bold">{overallSummary.totalStudents}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Present</p>
                        <p className="text-2xl font-bold text-green-600">{overallSummary.totalPresent}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Absent</p>
                        <p className="text-2xl font-bold text-red-600">{overallSummary.totalAbsent}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Late</p>
                        <p className="text-2xl font-bold text-yellow-600">{overallSummary.totalLate}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Attendance %</p>
                        <p className="text-2xl font-bold text-blue-600">{overallSummary.overallAttendancePercentage}%</p>
                    </div>
                </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead className="text-center">Total Students</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSummaries.map((summary) => (
                  <TableRow key={summary.className}>
                    <TableCell className="font-medium">{summary.className}</TableCell>
                    <TableCell className="text-center">{summary.totalStudents}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{summary.present}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{summary.absent}</TableCell>
                    <TableCell className="text-center text-yellow-600 font-medium">{summary.late}</TableCell>
                    <TableCell className={`text-center font-bold ${summary.attendancePercentage >= 90 ? 'text-green-600' : summary.attendancePercentage >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {summary.attendancePercentage}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="text-center py-10">
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg font-semibold">No Attendance Data to Display</p>
                <p className="text-muted-foreground">
                    {(allSchoolStudents.length > 0 && attendanceRecords.length === 0) ? "No attendance was marked for this date, or all students were absent." :
                     (allSchoolStudents.length === 0) ? "No students found for this school. Please add students via User Management." :
                     "No attendance data for the selected date."}
                </p>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                 <CardTitle>Fee Collection Summary Report (Annual Tuition - {currentAcademicYear})</CardTitle>
                 <Button
                    variant="outline"
                    onClick={handleDownloadFeePdf}
                    disabled={isLoading || isDownloadingFeePdf || !authUser || !feeOverallSummary || !schoolDetails}
                    className="w-full sm:w-auto"
                >
                    {isDownloadingFeePdf ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-0 sm:mr-2 h-4 w-4"/>}
                    <span className="sm:inline hidden">Download PDF</span>
                    <span className="sm:hidden inline">PDF</span>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
             {isLoading && !feeOverallSummary ? (
                 <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2">Loading fee collection data...</p>
                </div>
             ) : !authUser ? (
                <p className="text-center text-muted-foreground py-4">Please log in as a school admin to view reports.</p>
             ) : feeClassSummaries.length > 0 && feeOverallSummary && schoolDetails ? (
                <div id="feeReportContent" className="p-4 bg-card rounded-md">
                <Card className="mb-6 bg-secondary/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Overall School Fee Summary - {schoolDetails?.schoolName || 'School'} ({currentAcademicYear})</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Expected (Gross)</p>
                            <p className="text-2xl font-bold"><span className="font-sans">₹</span>{feeOverallSummary.grandTotalExpected.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Concessions</p>
                            <p className="text-2xl font-bold text-blue-600"><span className="font-sans">₹</span>{feeOverallSummary.grandTotalConcessions.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Collected</p>
                            <p className="text-2xl font-bold text-green-600"><span className="font-sans">₹</span>{feeOverallSummary.grandTotalCollected.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Due (Net)</p>
                            <p className="text-2xl font-bold text-red-600"><span className="font-sans">₹</span>{feeOverallSummary.grandTotalDue.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Collection % (of Net Payable)</p>
                            <p className="text-2xl font-bold text-blue-600">{feeOverallSummary.overallCollectionPercentage}%</p>
                            <Progress value={feeOverallSummary.overallCollectionPercentage} className="h-2 mt-1" />
                        </div>
                    </CardContent>
                </Card>

                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead className="text-right">Expected (<span className="font-sans">₹</span>)</TableHead>
                    <TableHead className="text-right">Concessions (<span className="font-sans">₹</span>)</TableHead>
                    <TableHead className="text-right">Collected (<span className="font-sans">₹</span>)</TableHead>
                    <TableHead className="text-right">Net Due (<span className="font-sans">₹</span>)</TableHead>
                    <TableHead className="text-center">Collection %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {feeClassSummaries.map((summary) => (
                    <TableRow key={summary.className}>
                        <TableCell className="font-medium">{summary.className}</TableCell>
                        <TableCell className="text-right"><span className="font-sans">₹</span>{summary.totalExpected.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600"><span className="font-sans">₹</span>{summary.totalConcessions.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium"><span className="font-sans">₹</span>{summary.totalCollected.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium"><span className="font-sans">₹</span>{summary.totalDue.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                                <span className={`font-bold ${summary.collectionPercentage >= 90 ? 'text-green-600' : summary.collectionPercentage >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {summary.collectionPercentage}%
                                </span>
                                <Progress value={summary.collectionPercentage} className="h-1.5 w-20 mt-1" />
                            </div>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
                </div>
             ) : (
                <div className="text-center py-10">
                    <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-lg font-semibold">No Fee Data to Display</p>
                    <p className="text-muted-foreground">
                        {(!allSchoolStudents.length) ? "No students found for this school. Please add students." :
                         (!schoolDetails) ? "School fee structure not loaded. Cannot calculate fee summaries." :
                         (!allSchoolPayments.length && !allSchoolConcessions.length && schoolDetails && allSchoolStudents.length > 0) ? "No fee payments or concessions have been recorded for this school year yet." :
                         "Fee data is currently unavailable."
                        }
                    </p>
                </div>
             )}
        </CardContent>
      </Card>
    </div>
  );
}

