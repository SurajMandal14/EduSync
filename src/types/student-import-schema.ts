import { z } from 'zod';

export const DB_SCHEMA_FIELDS = [
    { value: "name", label: "Student Name" },
    { value: "admissionId", label: "Admission ID" },
    { value: "email", label: "Email" },
    { value: "dob", label: "Date of Birth (YYYY-MM-DD)" },
    { value: "fatherName", label: "Father's Name" },
    { value: "motherName", label: "Mother's Name" },
    { value: "rollNo", label: "Roll No." },
    { value: "section", label: "Section" },
    { value: "gender", label: "Gender" },
    { value: "symbolNo", label: "Symbol No." },
    { value: "registrationNo", label: "Registration No." },
    { value: "district", label: "District" },
    { value: "quota", label: "Quota" },
    { value: "aadharNo", label: "Aadhar No." },
    { value: "phone", label: "Phone" }
] as const;

export type StudentDbField = (typeof DB_SCHEMA_FIELDS)[number]['value'];

export const studentImportInputSchema = z.object({
  headers: z.array(z.string()),
  sampleData: z.array(z.array(z.string())),
});
export type StudentImportInput = z.infer<typeof studentImportInputSchema>;

export const studentImportOutputSchema = z.record(
    z.string(), 
    z.enum([...DB_SCHEMA_FIELDS.map(f => f.value)]).nullable()
);
export type StudentImportOutput = z.infer<typeof studentImportOutputSchema>;
