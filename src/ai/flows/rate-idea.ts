// src/ai/flows/rate-idea.ts
'use server';
/**
 * @fileOverview A flow to rate the generated ideas.
 *
 * - rateIdea - A function that handles the rating of generated ideas.
 * - RateIdeaInput - The input type for the rateIdea function.
 * - RateIdeaOutput - The return type for the rateIdea function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RateIdeaInputSchema = z.object({
  idea: z.string().describe('The idea to be rated.'),
  rating: z.number().min(1).max(5).describe('The rating given to the idea (1-5).'),
  feedback: z.string().optional().describe('Optional feedback on why the idea was rated as such.'),
});
export type RateIdeaInput = z.infer<typeof RateIdeaInputSchema>;

const RateIdeaOutputSchema = z.object({
  success: z.boolean().describe('Whether the rating was successfully recorded.'),
  message: z.string().describe('A message indicating the result of the rating.'),
});
export type RateIdeaOutput = z.infer<typeof RateIdeaOutputSchema>;

export async function rateIdea(input: RateIdeaInput): Promise<RateIdeaOutput> {
  return rateIdeaFlow(input);
}

const rateIdeaFlow = ai.defineFlow(
  {
    name: 'rateIdeaFlow',
    inputSchema: RateIdeaInputSchema,
    outputSchema: RateIdeaOutputSchema,
  },
  async input => {
    // In a real application, you would likely store the rating and feedback
    // in a database or other persistent storage.
    // This example just returns a success message.
    console.log(`Idea: ${input.idea}, Rating: ${input.rating}, Feedback: ${input.feedback}`);
    return {
      success: true,
      message: 'Rating successfully recorded.',
    };
  }
);
