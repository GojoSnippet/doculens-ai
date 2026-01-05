import 'server-only';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Generate a concise, descriptive title for a chat based on the first message
 * Uses AI to create a 3-6 word summary that captures the topic
 */
export async function generateChatTitle(firstMessage: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      maxOutputTokens: 20,
      messages: [
        {
          role: 'system',
          content: `Generate a very short title (3-6 words max) for a chat that starts with this message. 
The title should capture the main topic or intent.
- Be concise and descriptive
- Don't use quotes or punctuation
- Don't start with "How to" or "Question about"
- Use title case
Examples:
"How do I center a div in CSS?" → "CSS Div Centering"
"Can you explain quantum computing?" → "Quantum Computing Basics"
"Write a poem about autumn" → "Autumn Poetry Request"
"What's the capital of France?" → "France Capital City"`
        },
        {
          role: 'user',
          content: firstMessage.substring(0, 500) // Limit input size
        }
      ]
    });

    // Clean up the response
    const title = text
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/[.!?]$/, '') // Remove trailing punctuation
      .substring(0, 60); // Max length

    return title || firstMessage.substring(0, 50);
  } catch (error) {
    console.error('Error generating chat title:', error);
    // Fallback to truncated first message
    const fallback = firstMessage.trim();
    return fallback.length > 50 
      ? fallback.substring(0, 50).trim() + '...'
      : fallback;
  }
}
