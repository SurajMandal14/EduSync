"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Wand2, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mapStudentData } from '@/ai/flows/map-student-data-flow';
import type { StudentDataMapping } from '@/ai/flows/map-student-data-flow';
import { DB_SCHEMA_FIELDS, type StudentDbField } from '@/types/student-import-schema';

// Mock data to simulate reading a CSV/Excel file
const mockCsvHeaders = ["Student_Name", "Full Name", "admission number", "D.O.B.", "Gender", "Contact Email", "Guardian", "Symbol", "District"];
const mockCsvSampleData = [
  ["John Doe", "John Doe", "S1001", "2005-04-12", "Male", "john.doe@example.com", "Robert Doe", "SYM123", "North District"],
  ["Jane Smith", "Jane Smith", "S1002", "2006-08-22", "Female", "jane.smith@example.com", "Mary Smith", "SYM124", "South District"],
];

type MappingState = 'idle' | 'loading' | 'mapped' | 'confirmed';

export default function StudentImportPage() {
  const { toast } = useToast();
  const [headers, setHeaders] = useState<string[]>(mockCsvHeaders);
  const [sampleData, setSampleData] = useState<string[][]>(mockCsvSampleData);
  const [mappings, setMappings] = useState<StudentDataMapping>({});
  const [mappingState, setMappingState] = useState<MappingState>('idle');

  const handleFileLoad = () => {
    // In a real app, you would use a file parser here (e.g., PapaParse)
    // For this example, we just use the mock data.
    toast({
      title: "File Loaded (Mock)",
      description: "Headers and sample data are ready.",
    });
    setMappingState('idle');
    setMappings({});
  };

  const runAiMapping = async () => {
    if (headers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Headers Found',
        description: 'Please load a file with headers first.',
      });
      return;
    }
    setMappingState('loading');
    try {
      const result = await mapStudentData({ headers, sampleData });
      setMappings(result);
      setMappingState('mapped');
      toast({
        title: 'AI Mapping Complete',
        description: 'Review the proposed mappings below.',
      });
    } catch (error) {
      console.error('AI Mapping Error:', error);
      toast({
        variant: 'destructive',
        title: 'AI Mapping Failed',
        description: 'An unexpected error occurred. Please try again.',
      });
      setMappingState('idle');
    }
  };

  const handleMappingChange = (header: string, dbField: StudentDbField | 'null') => {
    setMappings((prev) => ({
      ...prev,
      [header]: dbField === 'null' ? null : dbField,
    }));
  };

  const handleConfirmMappings = () => {
    // Here you would proceed with the import logic using the confirmed mappings.
    // This could involve transforming the full dataset and sending it to a bulk import server action.
    setMappingState('confirmed');
    toast({
        title: "Mappings Confirmed!",
        description: "Ready to import data. (Import logic not implemented in this demo)."
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <UploadCloud className="mr-2 h-6 w-6" /> Bulk Student Import
          </CardTitle>
          <CardDescription>
            Import student data from an Excel or CSV file. Use AI to automatically map your file columns to the database fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex gap-4">
                <Button onClick={handleFileLoad} variant="outline" disabled={mappingState !== 'idle'}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Load File (Mock)
                </Button>
                <Button onClick={runAiMapping} disabled={headers.length === 0 || mappingState === 'loading' || mappingState === 'mapped'}>
                    {mappingState === 'loading' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                    )}
                    Run AI Mapping
                </Button>
            </div>
        </CardContent>
      </Card>

      {mappingState === 'mapped' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Column Mappings</CardTitle>
            <CardDescription>
              The AI has proposed the following mappings from your file to the database. Please review and correct them if necessary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Your File Column</TableHead>
                  <TableHead>Sample Data</TableHead>
                  <TableHead>Database Field</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((header, index) => (
                  <TableRow key={header}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">{sampleData.map(row => row[index]).join(', ')}</TableCell>
                    <TableCell>
                      <Select
                        value={mappings[header] || 'null'}
                        onValueChange={(value: StudentDbField | 'null') => handleMappingChange(header, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">-- Do Not Import --</SelectItem>
                          {DB_SCHEMA_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-6">
                <Button onClick={handleConfirmMappings}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Confirm Mappings & Proceed
                </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mappingState === 'confirmed' && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-green-600"><CheckCircle className="mr-2 h-6 w-6"/> Mappings Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
                <p>The next step would be to process the entire file using these mappings and save the data to the database.</p>
                <pre className="mt-4 p-4 bg-muted rounded-md text-sm overflow-x-auto">
                    <code>{JSON.stringify({mappings, dataToImport: '... entire dataset ...'}, null, 2)}</code>
                </pre>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
