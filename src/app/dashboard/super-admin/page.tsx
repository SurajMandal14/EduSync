
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, ShieldAccount, Settings, AreaChart, Loader2, BadgePercent } from "lucide-react";
import { useState, useEffect } from "react";
import { getSchoolsCount } from "@/app/actions/schools";
import { getSchoolAdminsCount } from "@/app/actions/adminUsers";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  isLoading: boolean;
  link?: string;
  linkText?: string;
}

function StatCard({ title, value, icon: Icon, isLoading, link, linkText }: StatCardProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        {link && linkText && !isLoading && (
          <Link href={link} className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 block">
            {linkText}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboardPage() {
  const [schoolCount, setSchoolCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setIsLoadingSchools(true);
      const schoolsResult = await getSchoolsCount();
      if (schoolsResult.success && schoolsResult.count !== undefined) {
        setSchoolCount(schoolsResult.count);
      }
      setIsLoadingSchools(false);

      setIsLoadingAdmins(true);
      const adminsResult = await getSchoolAdminsCount();
      if (adminsResult.success && adminsResult.count !== undefined) {
        setAdminCount(adminsResult.count);
      }
      setIsLoadingAdmins(false);
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Super Admin Dashboard</CardTitle>
          <CardDescription>Oversee and manage the entire EduSync platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Welcome, Super Administrator. From here you can manage schools, system settings, and view platform analytics.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard 
            title="Total Registered Schools" 
            value={schoolCount} 
            icon={Building2} 
            isLoading={isLoadingSchools}
            link="/dashboard/super-admin/schools"
            linkText="Manage Schools"
        />
        <StatCard 
            title="Total School Administrators" 
            value={adminCount} 
            icon={ShieldAccount} 
            isLoading={isLoadingAdmins}
            link="/dashboard/super-admin/users"
            linkText="Manage Admins"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Building2 className="h-10 w-10 text-primary mb-2" />
            <CardTitle>School Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Create new schools, manage existing ones, and configure school-specific settings.</CardDescription>
            <Button asChild className="mt-4">
              <Link href="/dashboard/super-admin/schools">Manage Schools</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <ShieldAccount className="h-10 w-10 text-primary mb-2" />
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Manage administrator accounts for each school.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/super-admin/users">Manage Admins</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <BadgePercent className="h-10 w-10 text-primary mb-2" />
            <CardTitle>Fee Concessions</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Apply and manage fee concessions for students across schools.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/super-admin/concessions">Manage Concessions</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Settings className="h-10 w-10 text-primary mb-2" />
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Configure global platform settings and parameters.</CardDescription>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/dashboard/super-admin/settings">Platform Settings</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader>
                <AreaChart className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>View overall platform usage statistics and reports.</CardDescription>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/dashboard/super-admin/analytics">View Analytics</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
