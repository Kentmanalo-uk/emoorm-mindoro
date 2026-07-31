'use server';

/**
 * @fileOverview AI flow to suggest optimal pricing strategies for resort facilities.
 *
 * - suggestOptimalPricing - Analyzes data and suggests pricing.
 * - SuggestOptimalPricingInput - Input type for the function.
 * - SuggestOptimalPricingOutput - Return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOptimalPricingInputSchema = z.object({
  facilityType: z.string().describe('The type of facility (e.g., Kubo, Cabana, Room, Hall, House).'),
  historicalBookingData: z.string().describe('JSON string of historical booking data including dates, prices, and occupancy rates.'),
  competitorPricingData: z.string().describe('JSON string of competitor pricing data for similar facilities.'),
  seasonalTrendsData: z.string().describe('JSON string of seasonal trends data, including peak and off-peak periods.'),
  currentPrice: z.number().describe('The current price of the facility.'),
});
export type SuggestOptimalPricingInput = z.infer<typeof SuggestOptimalPricingInputSchema>;

const SuggestOptimalPricingOutputSchema = z.object({
  suggestedPrice: z.number().describe('The suggested optimal price for the facility.'),
  reasoning: z.string().describe('The reasoning behind the suggested price, based on the analysis of the input data.'),
});
export type SuggestOptimalPricingOutput = z.infer<typeof SuggestOptimalPricingOutputSchema>;

export async function suggestOptimalPricing(input: SuggestOptimalPricingInput): Promise<SuggestOptimalPricingOutput> {
  return suggestOptimalPricingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalPricingPrompt',
  input: {schema: SuggestOptimalPricingInputSchema},
  output: {schema: SuggestOptimalPricingOutputSchema},
  prompt: `You are an expert pricing strategist for resorts. Analyze the provided data and suggest an optimal price for the given facility type.

Facility Type: {{{facilityType}}}
Current Price: {{{currentPrice}}}

Historical Booking Data: {{{historicalBookingData}}}
Competitor Pricing Data: {{{competitorPricingData}}}
Seasonal Trends Data: {{{seasonalTrendsData}}}

Consider all factors to suggest a price that maximizes revenue while remaining competitive. Provide a clear reasoning for your suggested price.

Output the suggested price and reasoning in a JSON format.
`,
});

const suggestOptimalPricingFlow = ai.defineFlow(
  {
    name: 'suggestOptimalPricingFlow',
    inputSchema: SuggestOptimalPricingInputSchema,
    outputSchema: SuggestOptimalPricingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
