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
  output: { schema: studentImportOutputSchema },
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
      3. Be intelligent with the mapping. For example, if a header is "Student_Name", "full name", or "student", it should map to "name". "D.O.B." should map to "dob". "admission number" should map to "admissionId".
      4. If a column from the spreadsheet does not correspond to any available database field, its value in the JSON object should be \`null\`. Do not try to force a mapping.
      5. Ensure the final output is only the JSON object, with no extra text or explanations.
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
    try {
        const { output } = await mappingPrompt(input);
        if (!output) {
            throw new Error('AI failed to generate a mapping.');
        }
        return output;
    } catch(e) {
        console.error("Error in mapStudentDataFlow:", e);
        // Throw a more specific error or handle it as needed
        throw new Error("Failed to get a valid mapping from the AI model.");
    }
  }
);
