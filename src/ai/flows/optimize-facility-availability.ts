'use server';

/**
 * @fileOverview Analyzes booking patterns and facility usage data to optimize availability and suggest strategies.
 *
 * - optimizeFacilityAvailability - A function that handles the facility availability optimization process.
 * - OptimizeFacilityAvailabilityInput - The input type for the optimizeFacilityAvailability function.
 * - OptimizeFacilityAvailabilityOutput - The return type for the optimizeFacilityAvailability function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OptimizeFacilityAvailabilityInputSchema = z.object({
  bookingData: z.string().describe('Historical booking data in JSON format, including facility type, dates, and occupancy rates.'),
  facilityDetails: z.string().describe('Details of each facility, including capacity, pricing, and amenities in JSON format.'),
});
export type OptimizeFacilityAvailabilityInput = z.infer<
  typeof OptimizeFacilityAvailabilityInputSchema
>;

const OptimizeFacilityAvailabilityOutputSchema = z.object({
  analysisSummary: z
    .string()
    .describe('A summary of the booking pattern analysis, highlighting periods of low occupancy.'),
  suggestedStrategies: z.array(
    z.object({
      strategy: z.string().describe('A strategy to optimize availability, such as offering discounts or promotions.'),
      targetPeriod: z.string().describe('The specific period the strategy should be applied to.'),
      rationale: z
        .string()
        .describe('The rationale behind the suggested strategy, based on the analysis of booking patterns.'),
    })
  ),
  optimalPricingSuggestions: z.array(
    z.object({
      facilityType: z.string().describe('The type of facility for which pricing is suggested.'),
      suggestedPrice: z.number().describe('The optimal price for the facility during the target period.'),
      targetPeriod: z.string().describe('The specific period the suggested price should be applied to.'),
      rationale: z
        .string()
        .describe('The rationale behind the suggested price, based on demand and occupancy.'),
    })
  ),
});
export type OptimizeFacilityAvailabilityOutput = z.infer<
  typeof OptimizeFacilityAvailabilityOutputSchema
>;

export async function optimizeFacilityAvailability(
  input: OptimizeFacilityAvailabilityInput
): Promise<OptimizeFacilityAvailabilityOutput> {
  return optimizeFacilityAvailabilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeFacilityAvailabilityPrompt',
  input: { schema: OptimizeFacilityAvailabilityInputSchema },
  output: { schema: OptimizeFacilityAvailabilityOutputSchema },
  prompt: `You are an AI assistant designed to analyze order patterns and product sales data for E-Moorm, a hyperlocal digital marketplace in Oriental Mindoro, Philippines. Your goal is to identify periods of low sales and suggest strategies to optimize product availability, such as offering discounts or promotions during those times. You should also suggest optimal pricing based on demand and sales volume.

Analyze the following order data and product details to provide actionable insights and recommendations.

Booking Data:
{{{bookingData}}}

Facility Details:
{{{facilityDetails}}}

Based on the analysis, provide a summary of the sales patterns, highlighting periods of low demand. Then, suggest specific strategies to optimize sales during those periods, including discounts, promotions, or other incentives. Finally, suggest optimal pricing for different product categories based on demand and volume.

Ensure that your recommendations are tailored to the specific context of E-Moorm and are designed to maximize revenue and improve seller performance.

Output your response in JSON format.`,
});

const optimizeFacilityAvailabilityFlow = ai.defineFlow(
  {
    name: 'optimizeFacilityAvailabilityFlow',
    inputSchema: OptimizeFacilityAvailabilityInputSchema,
    outputSchema: OptimizeFacilityAvailabilityOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
