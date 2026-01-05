// app/api/chat/tools/WebsiteSearchTool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { generateObject, pruneMessages } from 'ai';
import { google } from '@ai-sdk/google';

// Rough token estimate: ~4 characters per token
const MAX_CONTENT_CHARS = 40000; // ~10000 tokens

// Zod schema for query variations
const websiteSearchSchema = z.object({
  queryVariation1: z
    .string()
    .min(1)
    .describe(
      'A variation targeting official government and authoritative websites. Use precise terminology that matches official language.'
    ),
  queryVariation2: z
    .string()
    .min(1)
    .describe(
      'A variation focusing on current developments and recent updates on the topic. Include temporal aspects and focus on updated information.'
    ),
  queryVariation3: z
    .string()
    .min(1)
    .describe(
      'A variation focusing on practical examples and applications. Search for cases, guides, and concrete implementations.'
    )
});

// Type definitions
interface SearchResultURL {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

type ExaSearchResult = {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
};

type ExaAPIResponse = {
  requestId: string;
  autopromptString?: string;
  autoDate?: string;
  resolvedSearchType?: string;
  results: ExaSearchResult[];
};

// Make sure the structure matches other tools exactly
export const websiteSearchTool = tool({
  description:
    'Search the web for up-to-date information. This tool is particularly effective for finding information on official government websites, recent developments, and practical implementation guides.',
  inputSchema: z.object({
    query: z.string().describe('The query to search for on the web')
  }),
  execute: async (args, { messages }) => {
    // Generate improved search queries
    const currentDate = new Date().toISOString().split('T')[0];

    // Prune messages to remove tool calls and reasoning blocks
    const prunedMessages = pruneMessages({
      messages: messages,
      reasoning: 'before-last-message',
      toolCalls: 'all',
      emptyMessages: 'remove'
    });

    const queryOptimizationPrompt = `
      <metadata>
      <current_date>${currentDate}</current_date>
      </metadata>

      As an expert in information retrieval, optimize the user's query into three different variations.
      Use the date above as a reference for timeliness.

      <instructions>
      1. The first variation should specifically target official authoritative websites:
         - Government agencies and departments
         - Official regulatory bodies
         - Public institutions
         - Authoritative organizations

      2. The second variation should focus on timeliness (based on ${currentDate}):
         - New rules and changes
         - Current interpretations
         - Latest practices and guidelines

      3. The third variation should focus on practical implementation:
         - Concrete examples
         - Guides and tutorials
         - Best practices and recommendations
      </instructions>

      <example>
      Original: "What are the rules for digital contracts?"

      Variation 1: "Official government guidance on digital contracts and electronic signatures"
      Variation 2: "Latest regulations ${currentDate.split('-')[0]} for digital contracts and e-signing"
      Variation 3: "Practical guide implementing digital contracts in business"
      </example>
      Message to optimize: ${args.query}
      `;

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      system: queryOptimizationPrompt,
      schema: websiteSearchSchema,
      messages: prunedMessages
    });

    const websiteQueries = [
      object.queryVariation1,
      object.queryVariation2,
      object.queryVariation3
    ].filter((query) => query !== undefined && query.trim() !== '');

    // Execute searches for each query variation using Exa API
    const searchPromises = websiteQueries.map(async (query) => {
      try {
        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.EXA_API_KEY || ''
          },
          body: JSON.stringify({
            query: query,
            type: 'auto',
            numResults: 2,
            contents: {
              text: true
            }
          })
        });

        if (!response.ok) {
          throw new Error(
            `Exa API error: ${response.status} ${response.statusText}`
          );
        }

        const data: ExaAPIResponse = await response.json();

        // Use the results directly from Exa
        return data.results.map((result: ExaSearchResult) => ({
          title: result.title,
          url: result.url,
          content: result.text || '',
          publishedDate: result.publishedDate
        }));
      } catch (error) {
        console.error('Error fetching from Exa API:', error);
        return [];
      }
    });

    const searchResultsArray = await Promise.all(searchPromises);

    // Deduplicate search results by URL
    const uniqueSearchResults = searchResultsArray
      .flat()
      .reduce((acc, result) => {
        if (!acc.some((r: SearchResultURL) => r.url === result.url)) {
          acc.push(result);
        }
        return acc;
      }, [] as SearchResultURL[]);

    const searchResults = uniqueSearchResults;

    // Build context array with truncated content if needed
    const contextArray = searchResults.map((result) => {
      let content = result.content;

      // Truncate if content exceeds max characters (~10000 tokens)
      if (content && content.length > MAX_CONTENT_CHARS) {
        content = content.slice(0, MAX_CONTENT_CHARS);
      }

      return {
        type: 'website',
        title: result.title,
        url: result.url,
        content: content,
        publishedDate: result.publishedDate
      };
    });

    // Create instructions for the AI
    const instructions = `
      Based on the content from the found websites, provide a concise and accurate answer to the user's question. If the information is insufficient, ask for more information or clarification.

      Follow these guidelines when responding:

      1. Integrate sources directly into your response as inline references using Markdown link formatting:
        Example: According to [Page title](URL), it is described that...

      2. When referencing specific content or sections from websites, always include them as inline links:
        As described in [Relevant section or heading](URL), the following applies...

      3. Make sure to link to all relevant sources you reference as a natural part of the text. This makes it easy for the reader to verify the information.

      4. If you reference specific content on a page but only have a general link, you should:
        - Link to the main page: [Page title](URL)
        - Mention the specific section or information in the text
        Example: On [Website name](URL) under the section "Specific section", it states that...

      5. Your response should be:
        - Precise and concise
        - Contain all relevant details
        - Have sources integrated naturally in the text
        - Be easy to read and understand

      6. Avoid collecting references at the end of your response. They should be a natural part of the text so the reader can easily follow the sources throughout.

      7. If information comes from multiple different pages, weave them together into a coherent response where the sources complement each other.

      Remember:
      - Be objective and factual in your communication
      - Ensure all claims are supported by sources
      - Write in a clear and professional language
      - Maintain the same high standard for citations as in academic writing`;

    // Return results in consistent format with other tools
    return {
      instructions: instructions,
      context: contextArray
    };
  }
});
