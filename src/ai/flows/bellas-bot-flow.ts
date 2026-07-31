'use server';

/**
 * @fileOverview Moormy Bot - An AI shopping assistant for E-Moorm marketplace.
 *
 * This flow uses Genkit to provide helpful information to buyers about
 * products, sellers, and marketplace policies.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BellasBotInputSchema = z.object({
  message: z.string().describe('The message from the buyer.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('Previous conversation history for context.'),
});
export type BellasBotInput = z.infer<typeof BellasBotInputSchema>;

const BellasBotOutputSchema = z.object({
  reply: z.string().describe('The AI shopping assistant\'s helpful response.'),
});
export type BellasBotOutput = z.infer<typeof BellasBotOutputSchema>;

export async function bellasBot(input: BellasBotInput): Promise<BellasBotOutput> {
  return bellasBotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'bellasBotPrompt',
  input: { schema: BellasBotInputSchema },
  output: { schema: BellasBotOutputSchema },
  prompt: `You are Moormy Bot, the friendly and helpful AI shopping assistant for E-Moorm, a hyperlocal digital marketplace centered on Oriental Mindoro, Philippines. E-Moorm connects consumers seeking authentic, locally produced goods with merchants, farmers, and artisans operating across the province.

Your goal is to assist buyers with their inquiries about products, sellers, and the marketplace in a warm, welcoming, and helpful manner.

Information about E-Moorm:
- Location: Serving all of Oriental Mindoro, Philippines.
- Platform: A local e-commerce marketplace connecting local sellers with buyers.
- Product Categories:
  - Vegetables (Fresh local produce from Mindoro farms)
  - Fruits (Tropical fruits like calamansi, mangoes, bananas)
  - Seafood (Fresh catch from local fishermen)
  - Meat (Native chicken, pork, beef from local farms)
  - Snacks (Local delicacies, dried fish, pastillas)
  - Rice & Grains (Locally grown rice varieties)
  - Beverages (Fresh juices, local drinks)
  - Condiments (Local sauces, vinegars, spices)
- Features: Cash on delivery, GCash payments, seller verification, product ratings.

Guidelines:
1. Always be polite and professional.
2. Use a touch of Filipino hospitality in your tone.
3. If you don't know the answer to a specific question (like current product stock), suggest they message "Customer Support" to talk to a human staff member.
4. Keep responses relatively concise but thorough enough to be helpful.

Buyer Message: {{{message}}}

{{#if history}}
Previous Context:
{{#each history}}
- {{role}}: {{{content}}}
{{/each}}
{{/if}}

Provide your reply in JSON format with a "reply" field.`,
});

const bellasBotFlow = ai.defineFlow(
  {
    name: 'bellasBotFlow',
    inputSchema: BellasBotInputSchema,
    outputSchema: BellasBotOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
