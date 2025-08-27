
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Printer, AlertTriangle } from "lucide-react";
import NursingCollegeFeeSlip, { type NursingStudentInfo, type NursingFeeSummary } from '@/components/report-cards/NursingCollege';


function ReceiptDisplay() {
  const searchParams = useSearchParams();
  const [studentInfo, setStudentInfo] = useState<NursingStudentInfo | null>(null);
  const [feeSummary, setFeeSummary] = useState<NursingFeeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const studentInfoParam = searchParams.get('studentInfo');
    const feeSummaryParam = searchParams.get('feeSummary');

    if (studentInfoParam && feeSummaryParam) {
      try {
        const parsedStudentInfo = JSON.parse(decodeURIComponent(studentInfoParam));
        const parsedFeeSummary = JSON.parse(decodeURIComponent(feeSummaryParam));
        setStudentInfo(parsedStudentInfo);
        setFeeSummary(parsedFeeSummary);
      } catch (e) {
        setError("Failed to parse receipt data from URL. Please try generating it again.");
        console.error("Parsing error:", e);
      }
    } else {
      setError("Receipt data is missing. Please close this window and generate the receipt again.");
    }
    setIsLoading(false);
  }, [searchParams]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Receipt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive mb-2">Error Loading Receipt</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => typeof window !== "undefined" && window.close()}>Close</Button>
      </div>
    );
  }

  if (!studentInfo || !feeSummary) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h1 className="text-2xl font-semibold mb-2">Receipt Data Not Found</h1>
              <p className="text-muted-foreground mb-6">Could not find the necessary information to display this receipt.</p>
              <Button onClick={() => typeof window !== "undefined" && window.close()}>Close</Button>
          </div>
      );
  }

  return (
      <div className="min-h-screen bg-muted p-4 sm:p-8 flex flex-col items-center print:bg-white print:p-0">
          <style jsx global>{`
              @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .no-print { display: none !important; }
                  .printable-receipt-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
              }
          `}</style>
          <Card className="w-full max-w-2xl shadow-xl printable-receipt-container print:shadow-none print:border-none">
              <CardContent className="p-0">
                  <NursingCollegeFeeSlip studentInfo={studentInfo} feeSummary={feeSummary} />
              </CardContent>
          </Card>
          <div className="mt-8 flex gap-4 no-print w-full max-w-2xl">
              <Button onClick={handlePrint} className="w-full sm:w-auto flex-1">
                  <Printer className="mr-2 h-4 w-4" /> Print Receipt
              </Button>
              <Button variant="outline" onClick={() => typeof window !== "undefined" && window.close()} className="w-full sm:w-auto flex-1">
                  Close
              </Button>
          </div>
      </div>
  );
};


export default function NursingFeeReceiptPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-muted p-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-3 text-lg">Loading Page...</p></div>}>
      <ReceiptDisplay />
    </Suspense>
  );
}
