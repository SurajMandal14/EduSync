'use server';

/**
 * @fileOverview Generates innovative ideas based on a user-provided topic.
 *
 * - generateIdeas - A function that generates a list of ideas based on a topic.
 * - GenerateIdeasInput - The input type for the generateIdeas function.
 * - GenerateIdeasOutput - The return type for the generateIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIdeasInputSchema = z.object({
  topic: z.string().describe('The topic or theme for which to generate ideas.'),
});
export type GenerateIdeasInput = z.infer<typeof GenerateIdeasInputSchema>;

const GenerateIdeasOutputSchema = z.object({
  ideas: z.array(z.string()).describe('A list of innovative ideas related to the topic.'),
});
export type GenerateIdeasOutput = z.infer<typeof GenerateIdeasOutputSchema>;

export async function generateIdeas(input: GenerateIdeasInput): Promise<GenerateIdeasOutput> {
  return generateIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateIdeasPrompt',
  input: {schema: GenerateIdeasInputSchema},
  output: {schema: GenerateIdeasOutputSchema},
  prompt: `You are an expert brainstorming assistant. Your goal is to generate a list of innovative ideas related to a specific topic.

  Topic: {{{topic}}}

  Generate a list of ideas that are novel, feasible, and have the potential for significant impact. Return the ideas as a JSON array of strings.
  Ensure that the output can be parsed by Javascript's JSON.parse function.
  Do not include any surrounding text or comments in the output.`,
});

const generateIdeasFlow = ai.defineFlow(
  {
    name: 'generateIdeasFlow',
    inputSchema: GenerateIdeasInputSchema,
    outputSchema: GenerateIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
