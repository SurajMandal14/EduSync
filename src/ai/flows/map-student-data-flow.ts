
'use server';
/**
 * @fileOverview A Genkit flow for mapping student data from a spreadsheet.
 * 
 * - mapStudentData: A function that takes spreadsheet headers and sample data and maps them to database fields.
 * - StudentDataMapping: The return type for the mapStudentData function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  studentImportInputSchema,
  studentImportOutputSchema,
  DB_SCHEMA_FIELDS,
} from '@/types/student-import-schema';

export type StudentDataMapping = z.infer<typeof studentImportOutputSchema>;

export async function mapStudentData(
  input: z.infer<typeof studentImportInputSchema>
): Promise<StudentDataMapping> {
  return mapStudentDataFlow(input);
}

const mappingPrompt = ai.definePrompt({
  name: 'mapStudentDataPrompt',
  input: { schema: studentImportInputSchema },
  prompt: `
      You are an intelligent data mapping assistant for a school management system. Your task is to map the columns from a user's uploaded spreadsheet to the predefined database schema fields.

      Here are the available database fields:
      ${DB_SCHEMA_FIELDS.map(f => `- "${f.value}" (Represents: ${f.label})`).join('\n')}
      
      Here are the headers from the user's spreadsheet:
      {{headers}}

      Here are a few sample rows of their data to give you context:
      {{#each sampleData as |row|}}
      {{#each row as |cell|}}{{cell}}, {{/each}}
      {{/each}}

      Based on the headers and the sample data, create a JSON object that maps each header from the user's spreadsheet to the most appropriate database field.

      Rules:
      1. The keys of the output JSON object must be the exact header strings from the user's spreadsheet.
      2. The values must be one of the available database field keys.
      3. Be intelligent with the mapping. For example, if a header is "Student_Name", "full name", or "student", it should map to "name". "D.O.B." or "Date of Birth" should map to "dob". "Registration No." or "Reg No" should map to "registrationNo".
      4. If a column from the spreadsheet does not correspond to any available database field (like "SN" for serial number), its value in the JSON object must be \`null\`. Do not try to force a mapping for irrelevant columns.
      5. Ensure the final output is ONLY the JSON object, with no extra text or explanations.
    `,
  config: {
    temperature: 0.1, // Lower temperature for more deterministic mapping
  },
});

const mapStudentDataFlow = ai.defineFlow(
  {
    name: 'mapStudentDataFlow',
    inputSchema: studentImportInputSchema,
    outputSchema: studentImportOutputSchema,
  },
  async (input) => {
    const { text } = await mappingPrompt(input);
    const output = text;
    if (!output) {
      throw new Error('AI failed to generate a mapping.');
    }
    try {
      // Clean the output to ensure it's a valid JSON string
      const jsonString = output.trim().replace(/```json|```/g, '');
      const parsed = JSON.parse(jsonString);
      return studentImportOutputSchema.parse(parsed);
    } catch (e) {
      console.error("Failed to parse AI output:", e, "Raw output:", output);
      throw new Error("AI returned an invalid JSON object.");
    }
  }
);
