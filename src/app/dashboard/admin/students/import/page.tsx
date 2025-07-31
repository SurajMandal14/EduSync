
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Wand2, Loader2, CheckCircle, ArrowRight, Download, Info, AlertTriangle, BookCopy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mapStudentData } from '@/ai/flows/map-student-data-flow';
import type { StudentDataMapping } from '@/ai/flows/map-student-data-flow';
import { DB_SCHEMA_FIELDS, type StudentDbField } from '@/types/student-import-schema';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bulkCreateSchoolUsers } from '@/app/actions/schoolUsers';
import { getClassesForSchoolAsOptions } from '@/app/actions/classes';
import type { CreateSchoolUserServerActionFormData, AuthUser } from '@/types/user';
import { format, parse } from 'date-fns';

type MappingState = 'idle' | 'file_loaded' | 'loading_mapping' | 'mapped' | 'importing' | 'imported';

interface ClassOption {
    value: string;
    label: string;
}

export default function StudentImportPage() {
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [fullData, setFullData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<StudentDataMapping>({});
  const [mappingState, setMappingState] = useState<MappingState>('idle');
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  const fetchClassOptions = useCallback(async (schoolId: string) => {
    const options = await getClassesForSchoolAsOptions(schoolId);
    setClassOptions(options);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setAuthUser(parsedUser);
        if (parsedUser?.schoolId) {
            fetchClassOptions(parsedUser.schoolId);
        }
    }
  }, [fetchClassOptions]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }); // Use defval to handle empty cells
        
        if (json.length < 2) {
          toast({ variant: 'destructive', title: 'Invalid File', description: 'The spreadsheet must contain at least one header row and one data row.' });
          return;
        }

        const extractedHeaders = (json[0] as any[]).map(String);
        
        // Ensure all data, including from empty cells, is treated as a string
        const allRowsAsString = (json.slice(1) as any[][]).map(row => 
          row.map(cell => {
            if (cell instanceof Date) {
              return format(cell, 'yyyy-MM-dd');
            }
            return String(cell ?? ''); // Convert null/undefined to empty string
          })
        );

        const extractedSample = allRowsAsString.slice(0, 5);
        
        const jsonDataObjects = XLSX.utils.sheet_to_json(worksheet, {
            raw: false, 
            defval: "" // Ensure empty cells are read as empty strings
        }).map(row => {
            const newRow: {[key: string]: any} = {};
            for (const key in row) {
                const cell = (row as any)[key];
                 if (cell instanceof Date) {
                    newRow[key] = format(cell, 'yyyy-MM-dd');
                } else {
                    newRow[key] = String(cell ?? '');
                }
            }
            return newRow;
        });


        setHeaders(extractedHeaders);
        setSampleData(extractedSample);
        setFullData(jsonDataObjects);
        setMappingState('file_loaded');
        setMappings({});
        setImportResult(null);
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

  const handleProcessAndImport = async () => {
    if (!authUser?.schoolId) {
        toast({ variant: "destructive", title: "Error", description: "Admin school ID not found. Please log in again." });
        return;
    }
     if (!selectedClassId) {
        toast({ variant: "destructive", title: "Class Not Selected", description: "Please select a class to import students into." });
        return;
    }
    if (Object.values(mappings).every(v => v === null)) {
        toast({ variant: "destructive", title: "No Mappings", description: "At least one column must be mapped to a database field." });
        return;
    }
    setMappingState('importing');

    const studentsToImport: CreateSchoolUserServerActionFormData[] = [];
    const reverseMappings: { [key: string]: string } = {};
    for(const key in mappings) {
        if(mappings[key]) {
            reverseMappings[mappings[key]!] = key;
        }
    }

    for (const row of fullData) {
        const studentData: Partial<CreateSchoolUserServerActionFormData> = { role: 'student' };
        for (const dbField of DB_SCHEMA_FIELDS) {
            const fileHeader = reverseMappings[dbField.value];
            if (fileHeader && row[fileHeader]) {
                (studentData as any)[dbField.value] = row[fileHeader];
            }
        }
        
        studentsToImport.push(studentData as CreateSchoolUserServerActionFormData);
    }
    
    const result = await bulkCreateSchoolUsers(studentsToImport, authUser.schoolId, selectedClassId);
    if(result.success) {
        toast({ title: "Import Complete", description: result.message });
        setImportResult({ importedCount: result.importedCount, skippedCount: result.skippedCount, errors: result.errors });
    } else {
        toast({ variant: 'destructive', title: "Import Failed", description: result.message });
        setImportResult({ importedCount: 0, skippedCount: fullData.length, errors: result.errors.length > 0 ? result.errors : ["An unknown error occurred during import."] });
    }
    setMappingState('imported');
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

      {(mappingState === 'mapped' || mappingState === 'importing' || mappingState === 'imported') && (
        <Card>
          <CardHeader>
            <CardTitle>Review Column Mappings</CardTitle>
            <CardDescription>
              The AI has proposed the following mappings. Review and correct them if necessary.
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
                        disabled={mappingState === 'importing' || mappingState === 'imported'}
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
              <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="class-select" className="flex items-center mb-2"><BookCopy className="mr-2 h-4 w-4 text-muted-foreground"/>Assign to Class</Label>
                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                        <SelectTrigger id="class-select" className="w-full md:w-1/2">
                            <SelectValue placeholder="Select a class for all students"/>
                        </SelectTrigger>
                        <SelectContent>
                            {classOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                      <Button onClick={handleProcessAndImport} disabled={!selectedClassId}>
                          <CheckCircle className="mr-2 h-4 w-4" /> Process & Import Data
                      </Button>
                  </div>
              </div>
            )}
             {mappingState === 'importing' && (
              <div className="flex justify-end mt-6">
                  <Button disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing... Please wait.
                  </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {mappingState === 'imported' && importResult && (
        <Card className={importResult.errors.length > 0 ? "border-destructive" : "border-green-500"}>
             <CardHeader>
                <CardTitle className={`flex items-center ${importResult.errors.length > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    <CheckCircle className="mr-2 h-6 w-6"/> Import Complete
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <p><strong>Successfully Imported:</strong> {importResult.importedCount}</p>
                  <p><strong>Skipped Records:</strong> {importResult.skippedCount}</p>
               </div>
               {importResult.errors.length > 0 && (
                <div>
                    <h4 className="font-semibold text-destructive flex items-center"><AlertTriangle className="mr-2 h-4 w-4"/>Errors & Warnings:</h4>
                    <ul className="list-disc pl-5 mt-2 text-sm text-destructive max-h-40 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
               )}
                <Button onClick={() => fileInputRef.current && (fileInputRef.current.value = '') & setMappingState('idle') & setFileName(null)}>
                    Import Another File
                </Button>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
