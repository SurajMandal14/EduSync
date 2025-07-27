"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Wand2, Loader2, CheckCircle, ArrowRight, Download, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mapStudentData } from '@/ai/flows/map-student-data-flow';
import type { StudentDataMapping } from '@/ai/flows/map-student-data-flow';
import { DB_SCHEMA_FIELDS, type StudentDbField } from '@/types/student-import-schema';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MappingState = 'idle' | 'file_loaded' | 'loading_mapping' | 'mapped' | 'confirmed';

export default function StudentImportPage() {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [fullData, setFullData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<StudentDataMapping>({});
  const [mappingState, setMappingState] = useState<MappingState>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length < 2) {
          toast({ variant: 'destructive', title: 'Invalid File', description: 'The spreadsheet must contain at least one header row and one data row.' });
          return;
        }

        const extractedHeaders = (json[0] as any[]).map(String);
        
        // Ensure all data is converted to string to prevent type errors
        const allRowsAsString = (json.slice(1) as any[][]).map(row => 
          row.map(cell => String(cell ?? ''))
        );

        const extractedSample = allRowsAsString.slice(0, 5);
        
        // For processing, it's better to have objects with consistent string values too
        const jsonDataObjects = XLSX.utils.sheet_to_json(worksheet, {
            raw: false, // This ensures dates are formatted as strings, not numbers
        }).map(row => {
            const newRow: {[key: string]: any} = {};
            for (const key in row) {
                newRow[key] = String((row as any)[key] ?? '');
            }
            return newRow;
        });


        setHeaders(extractedHeaders);
        setSampleData(extractedSample);
        setFullData(jsonDataObjects);
        setMappingState('file_loaded');
        setMappings({});
        toast({ title: 'File Loaded Successfully', description: `${allRowsAsString.length} records found in "${file.name}".` });
      } catch (error) {
        console.error("File parsing error:", error);
        toast({ variant: 'destructive', title: 'File Error', description: 'Could not read or parse the file. Please ensure it is a valid Excel or CSV file.' });
      }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Error', description: 'There was an error reading the file.' });
    };
    reader.readAsBinaryString(file);
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
    setMappingState('loading_mapping');
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
      setMappingState('file_loaded');
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
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <Label htmlFor="file-upload" className="w-full sm:w-auto">
                      <Button asChild className="w-full sm:w-auto cursor-pointer">
                          <span><UploadCloud className="mr-2 h-4 w-4" /> Upload Spreadsheet</span>
                      </Button>
                      <Input 
                        id="file-upload" 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange} 
                        accept=".xlsx, .xls, .csv"
                        className="sr-only"
                      />
                  </Label>
                  <Button variant="outline" disabled>
                      <Download className="mr-2 h-4 w-4"/> Download Template
                  </Button>
                </div>
                {fileName && <p className="text-sm text-muted-foreground mt-2">Loaded file: <span className="font-medium">{fileName}</span> ({fullData.length} records)</p>}
                
                {mappingState === 'idle' && !fileName && (
                    <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg mt-4">
                        <Info className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Upload a file to get started.</p>
                    </div>
                )}
                
                {mappingState === 'file_loaded' && (
                     <Button onClick={runAiMapping} className="mt-4">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Run AI Mapping
                    </Button>
                )}
                 {mappingState === 'loading_mapping' && (
                     <Button onClick={runAiMapping} className="mt-4" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Columns...
                    </Button>
                )}

            </div>
        </CardContent>
      </Card>

      {(mappingState === 'mapped' || mappingState === 'confirmed') && (
        <Card>
          <CardHeader>
            <CardTitle>Review Column Mappings</CardTitle>
            <CardDescription>
              The AI has proposed the following mappings from your file to the database. Please review and correct them if necessary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Your File Column</TableHead>
                  <TableHead className="min-w-[250px]">Sample Data</TableHead>
                  <TableHead className="min-w-[200px]">Database Field</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((header, index) => (
                  <TableRow key={header}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">{sampleData.map(row => row[index] || '').join(', ')}</TableCell>
                    <TableCell>
                      <Select
                        value={mappings[header] || 'null'}
                        onValueChange={(value: StudentDbField | 'null') => handleMappingChange(header, value)}
                        disabled={mappingState === 'confirmed'}
                      >
                        <SelectTrigger>
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
            </div>
            {mappingState === 'mapped' && (
              <div className="flex justify-end mt-6">
                  <Button onClick={handleConfirmMappings}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Confirm Mappings & Proceed
                  </Button>
              </div>
            )}
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
                    <code>{JSON.stringify({mappings, dataToImport: fullData.slice(0, 2)}, null, 2)}...</code>
                </pre>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
