
"use client";

import Link from "next/link";
import { Layers as ScholrIcon, UserCircle, LogOut, Menu, Settings, Users, DollarSign, CheckSquare, LayoutDashboard, BookUser, ShieldAlert, User as UserIcon, BookCopy, TicketPercent, BarChart2, Briefcase, Award } from "lucide-react"; // Added Award
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";
import type { AuthUser } from "@/types/user";
import { getSchoolById } from "@/app/actions/schools";

const navLinksBase = {
  superadmin: [
    { href: "/dashboard/super-admin", label: "SA Dashboard", icon: ShieldAlert },
    { href: "/dashboard/super-admin/schools", label: "Schools", icon: ScholrIcon },
    { href: "/dashboard/super-admin/users", label: "School Admins", icon: Users },
    { href: "/dashboard/super-admin/concessions", label: "Concessions", icon: TicketPercent },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Admin Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/admin/students", label: "Students", icon: BookUser },
    { href: "/dashboard/admin/teachers", label: "Teachers", icon: Briefcase },
    { href: "/dashboard/admin/classes", label: "Classes", icon: BookCopy },
    { href: "/dashboard/admin/fees", label: "Fees", icon: DollarSign },
    { href: "/dashboard/admin/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/dashboard/admin/reports", label: "Reports", icon: BarChart2 },
    { href: "/dashboard/admin/settings", label: "School Settings", icon: Settings },
  ],
  teacher: [
    { href: "/dashboard/teacher", label: "Teacher Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/teacher/attendance", label: "Mark Attendance", icon: CheckSquare },
    { href: "/dashboard/teacher/marks", label: "Enter Marks", icon: BookCopy },
    { href: "/dashboard/teacher/profile", label: "My Profile", icon: UserIcon },
  ],
  student: [
    { href: "/dashboard/student", label: "Student Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/student/fees", label: "My Fees", icon: DollarSign },
    { href: "/dashboard/student/attendance", label: "My Attendance", icon: CheckSquare },
    { href: "/dashboard/student/results", label: "Exam Results", icon: Award }, // Changed icon to Award
    { href: "/dashboard/student/profile", label: "My Profile", icon: BookUser },
  ],
};

type Role = keyof typeof navLinksBase;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [displaySchoolName, setDisplaySchoolName] = useState<string | null>(null);
  const [displaySchoolLogoUrl, setDisplaySchoolLogoUrl] = useState<string | null | undefined>(null);
  const [isLoadingSchoolDetails, setIsLoadingSchoolDetails] = useState(false);

  const getShortSchoolName = (fullName: string | undefined): string | null => {
    if (!fullName) return null;
    return fullName.length > 25 ? fullName.substring(0, 22) + "..." : fullName;
  };

  const fetchSchoolDetails = useCallback(async (schoolId: string) => {
    setIsLoadingSchoolDetails(true);
    const result = await getSchoolById(schoolId);
    if (result.success && result.school) {
      setDisplaySchoolName(getShortSchoolName(result.school.schoolName));
      setDisplaySchoolLogoUrl(result.school.schoolLogoUrl);
    } else {
      toast({ variant: "warning", title: "School Info", description: "Could not load school details for header."});
      setDisplaySchoolName(null);
      setDisplaySchoolLogoUrl(null);
    }
    setIsLoadingSchoolDetails(false);
  }, [toast]);

  useEffect(() => {
    setIsLoadingUser(true);
    const storedUser = localStorage.getItem('loggedInUser');

    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role) {
          setAuthUser(parsedUser);
          if (parsedUser.schoolId && parsedUser.role !== 'superadmin') {
            fetchSchoolDetails(parsedUser.schoolId.toString());
          } else {
            setDisplaySchoolName(null);
            setDisplaySchoolLogoUrl(null);
            setIsLoadingSchoolDetails(false);
          }
        } else {
          localStorage.removeItem('loggedInUser');
          setAuthUser(null);
          setDisplaySchoolName(null);
          setDisplaySchoolLogoUrl(null);
          setIsLoadingSchoolDetails(false);
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage in Header:", e);
        localStorage.removeItem('loggedInUser');
        setAuthUser(null);
        setDisplaySchoolName(null);
        setDisplaySchoolLogoUrl(null);
        setIsLoadingSchoolDetails(false);
      } finally {
        setIsLoadingUser(false);
      }
    } else {
      if (storedUser) {
        localStorage.removeItem('loggedInUser');
      }
      setAuthUser(null);
      setDisplaySchoolName(null);
      setDisplaySchoolLogoUrl(null);
      setIsLoadingUser(false);
      setIsLoadingSchoolDetails(false);
    }
  }, [pathname, fetchSchoolDetails]);


  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setAuthUser(null);
    setDisplaySchoolName(null);
    setDisplaySchoolLogoUrl(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push("/");
    setIsSheetOpen(false);
  };

  const currentRole = authUser?.role as Role | undefined;
  const currentNavLinks = currentRole ? navLinksBase[currentRole] || [] : [];

  const HeaderTitleContent = () => (
    <>
      {authUser?.role !== 'superadmin' ? (
        <>
          {displaySchoolLogoUrl ? (
            <img
              src={displaySchoolLogoUrl}
              alt={displaySchoolName || "School Logo"}
              data-ai-hint="school logo"
              className="h-8 w-8 rounded-sm object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                // Create a span to show ScholrIcon as a fallback if image errors
                const fallbackIcon = document.createElement('span');
                fallbackIcon.id="logo-fallback-icon";
                const svgNS = "http://www.w3.org/2000/svg";
                const svg = document.createElementNS(svgNS, "svg");
                  svg.setAttribute("width", "28");
                  svg.setAttribute("height", "28");
                  svg.setAttribute("viewBox", "0 0 24 24");
                  svg.setAttribute("fill", "none");
                  svg.setAttribute("stroke", "currentColor");
                  svg.setAttribute("stroke-width", "2");
                  svg.setAttribute("stroke-linecap", "round");
                  svg.setAttribute("stroke-linejoin", "round");
                  const path1 = document.createElementNS(svgNS, "path");
                  path1.setAttribute("d", "M14 22v-4a2 2 0 1 0-4 0v4");
                  const path2 = document.createElementNS(svgNS, "path");
                  path2.setAttribute("d", "m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2");
                  const path3 = document.createElementNS(svgNS, "path");
                  path3.setAttribute("d", "M18 5v17");
                  const path4 = document.createElementNS(svgNS, "path");
                  path4.setAttribute("d", "m4 6 8-4 8 4");
                  const path5 = document.createElementNS(svgNS, "path");
                  path5.setAttribute("d", "M6 5v17");
                  svg.appendChild(path1);
                  svg.appendChild(path2);
                  svg.appendChild(path3);
                  svg.appendChild(path4);
                  svg.appendChild(path5);
                fallbackIcon.appendChild(svg);
                if (e.currentTarget.parentNode && !document.getElementById("logo-fallback-icon")) {
                    e.currentTarget.parentNode.insertBefore(fallbackIcon, e.currentTarget.nextSibling);
                }
              }}
            />
          ) : (
            <ScholrIcon className="h-7 w-7 text-primary" />
          )}
          {displaySchoolName && (
            <span className="ml-2 text-sm font-medium text-muted-foreground truncate max-w-[150px] sm:max-w-[200px] group-hover:text-primary transition-colors">
              {displaySchoolName}
            </span>
          )}
           {!displaySchoolLogoUrl && !displaySchoolName && authUser?.role !== 'superadmin' && (
             <span className="ml-2 font-headline text-primary">EduSync</span>
           )}
        </>
      ) : (
        <>
          <ScholrIcon className="h-7 w-7 text-primary" />
          <span className="ml-2 font-headline text-primary">EduSync</span>
        </>
      )}
    </>
  );


  if (isLoadingUser || (authUser && authUser.role !== 'superadmin' && isLoadingSchoolDetails)) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
            <ScholrIcon className="h-7 w-7 text-primary animate-pulse" />
             <span className="ml-2 font-headline text-primary/80 animate-pulse">Loading...</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold sm:text-xl group" onClick={() => setIsSheetOpen(false)}>
          <HeaderTitleContent />
        </Link>

        {authUser && (
          <>
            <nav className="hidden md:flex gap-4 items-center">
              {currentNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === link.href ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    {authUser.avatarUrl ? (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={authUser.avatarUrl} alt={authUser.name} data-ai-hint="user avatar"/>
                        <AvatarFallback>{authUser.name ? authUser.name.substring(0,1).toUpperCase() : "U"}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <UserCircle className="h-6 w-6" />
                    )}
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{authUser.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {authUser.email} ({authUser.role && authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1)})
                         {authUser.role === 'student' && authUser.admissionId && ` - Adm No: ${authUser.admissionId}`}
                         {authUser.classId && (authUser.role === 'student' || authUser.role === 'teacher') && ` - Class: ${authUser.classId}`}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {router.push('/dashboard/profile'); setIsSheetOpen(false);}}>
                    <UserIcon className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {router.push('/dashboard/settings'); setIsSheetOpen(false);}}>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="pt-10">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <nav className="grid gap-4 text-base font-medium">
                    <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4 group" onClick={() => setIsSheetOpen(false)}>
                      <HeaderTitleContent />
                    </Link>
                    {currentNavLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsSheetOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                          pathname === link.href ? "text-primary bg-muted" : "text-muted-foreground"
                        }`}
                      >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
        {!authUser && !isLoadingUser && (
            <Button asChild onClick={() => setIsSheetOpen(false)}>
                <Link href="/">Login</Link>
            </Button>
        )}
      </div>
    </header>
  );
}
