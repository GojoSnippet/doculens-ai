import { tool } from 'ai';
import { z } from 'zod';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createServerSupabaseClient } from '@/lib/server/server';
import { CohereClient } from 'cohere-ai';
import Fuse from 'fuse.js';

const embeddingModel = openai.embedding('text-embedding-3-small');

// Initialize Cohere client for reranking
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || ''
});

// Rough token estimate: ~4 characters per token
const MAX_CONTENT_CHARS = 40000; // ~10000 tokens

interface SearchUserDocumentProps {
  userId: string;
}

interface SearchResult {
  id: string;
  text: string;
  title: string;
  timestamp?: string;
  ai_title?: string;
  ai_description?: string;
  ai_maintopics?: string;
  ai_keyentities?: string;
  page: number;
  totalPages?: number;
  similarity: number;
  rerankScore?: number;
}

// Embed query function
async function embedQuery(text: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text
  });
  return embedding;
}

// Function to get user's document IDs
async function getUserDocumentIds(userId: string): Promise<string[]> {
  console.log('[getUserDocumentIds] Fetching documents for userId:', userId);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('user_documents')
    .select('id, title')
    .eq('user_id', userId);

  if (error) {
    console.error('[getUserDocumentIds] Error fetching user documents:', error);
    return [];
  }

  console.log('[getUserDocumentIds] Found documents:', data);
  return data?.map((doc) => doc.id) ?? [];
}

// Function to query Supabase vectors (semantic search)
async function querySupabaseVectors(
  queryEmbedding: number[],
  userId: string,
  documentIds: string[],
  topK: number,
  similarityThreshold: number
): Promise<SearchResult[]> {
  console.log('[VectorSearch] Starting vector search');
  console.log('[VectorSearch] userId:', userId);
  console.log('[VectorSearch] documentIds:', documentIds);
  console.log('[VectorSearch] topK:', topK);
  console.log('[VectorSearch] similarityThreshold:', similarityThreshold);
  console.log('[VectorSearch] embedding length:', queryEmbedding.length);

  const supabase = await createServerSupabaseClient();

  const embeddingString = `[${queryEmbedding.join(',')}]`;

  console.log('[VectorSearch] Calling match_documents RPC...');
  const { data: matches, error } = await supabase.rpc('match_documents', {
    query_embedding: embeddingString,
    match_count: topK,
    filter_user_id: userId,
    file_ids: documentIds,
    similarity_threshold: similarityThreshold
  });

  if (error) {
    console.error('[VectorSearch] Error querying vectors:', error);
    throw error;
  }

  console.log('[VectorSearch] Raw matches returned:', matches?.length || 0);
  if (matches && matches.length > 0) {
    console.log('[VectorSearch] First match:', JSON.stringify(matches[0], null, 2));
  }

  return matches.map((match: Record<string, unknown>) => ({
    id: match.id as string,
    text: match.text_content as string,
    title: match.title as string,
    timestamp: match.doc_timestamp as string,
    ai_title: match.ai_title as string,
    ai_description: match.ai_description as string,
    ai_maintopics: match.ai_maintopics as string,
    ai_keyentities: match.ai_keyentities as string,
    page: match.page_number as number,
    totalPages: match.total_pages as number,
    similarity: match.similarity as number
  }));
}

// BM25/Fuzzy keyword search using Fuse.js
function keywordSearch(query: string, documents: SearchResult[]): SearchResult[] {
  if (documents.length === 0) return [];

  const fuse = new Fuse(documents, {
    keys: ['text', 'title', 'ai_title', 'ai_description'],
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  const results = fuse.search(query);

  return results.map((result) => ({
    ...result.item,
    // Convert Fuse score (0 = perfect match) to similarity (1 = perfect match)
    similarity: result.score ? 1 - result.score : 0.5
  }));
}

// Reciprocal Rank Fusion to combine multiple result sets
function reciprocalRankFusion(
  resultSets: SearchResult[][],
  k: number = 60
): SearchResult[] {
  const scores = new Map<string, { score: number; item: SearchResult }>();

  resultSets.forEach((results) => {
    results.forEach((doc, rank) => {
      const key = `${doc.title}-${doc.page}`;
      const currentEntry = scores.get(key);
      const newScore = 1 / (k + rank + 1);

      if (currentEntry) {
        currentEntry.score += newScore;
        // Keep the item with higher original similarity
        if (doc.similarity > currentEntry.item.similarity) {
          currentEntry.item = doc;
        }
      } else {
        scores.set(key, { score: newScore, item: doc });
      }
    });
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      ...entry.item,
      similarity: entry.score // Use RRF score as final similarity
    }));
}

// Rerank results using Cohere
async function rerankResults(
  query: string,
  documents: SearchResult[],
  topN: number = 15
): Promise<SearchResult[]> {
  if (documents.length === 0) return [];

  // Skip reranking if no API key is configured
  if (!process.env.COHERE_API_KEY) {
    console.warn('COHERE_API_KEY not set, skipping reranking');
    return documents.slice(0, topN);
  }

  try {
    const reranked = await cohere.rerank({
      model: 'rerank-english-v3.0',
      query: query,
      documents: documents.map((d) => d.text.slice(0, 4000)), // Cohere has token limits
      topN: Math.min(topN, documents.length)
    });

    return reranked.results.map((r) => ({
      ...documents[r.index],
      rerankScore: r.relevanceScore,
      similarity: r.relevanceScore // Use rerank score as final similarity
    }));
  } catch (error) {
    console.error('Reranking failed, using original order:', error);
    return documents.slice(0, topN);
  }
}

// Hybrid search combining vector search and keyword search with reranking
async function hybridSearch(
  query: string,
  userId: string,
  documentIds: string[],
  topK: number = 30
): Promise<SearchResult[]> {
  // Get query embedding
  const queryEmbedding = await embedQuery(query);

  // Run vector search
  const vectorResults = await querySupabaseVectors(
    queryEmbedding,
    userId,
    documentIds,
    topK,
    0.3
  );

  // Run keyword search on vector results (BM25-like)
  const keywordResults = keywordSearch(query, vectorResults);

  // Combine results using Reciprocal Rank Fusion
  const combinedResults = reciprocalRankFusion([vectorResults, keywordResults]);

  // Rerank top results for better accuracy
  const rerankedResults = await rerankResults(query, combinedResults, 15);

  return rerankedResults;
}

export const searchUserDocument = ({ userId }: SearchUserDocumentProps) =>
  tool({
    description: `Search through the user's uploaded documents to find relevant information. Use this tool when the user asks questions about their documents or when you need to find specific information from their uploaded files.`,
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'The search query to find relevant information in the documents'
        )
    }),
    outputSchema: z.object({
      instructions: z.string().describe('Instructions for the AI on how to use the search results'),
      context: z.array(z.object({
        type: z.string(),
        title: z.string(),
        aiTitle: z.string().optional(),
        page: z.number(),
        totalPages: z.number().optional(),
        content: z.string(),
        pdfLink: z.string(),
        relevanceScore: z.number().optional()
      })).describe('Array of document contexts found'),
      searchMetadata: z.object({
        totalResults: z.number(),
        searchMethod: z.string(),
        rerankingApplied: z.boolean()
      }).optional()
    }),
    execute: async ({ query }, { messages }) => {
      console.log('[DocumentSearch] Starting search for userId:', userId);
      console.log('[DocumentSearch] Query:', query);

      // Get user's document IDs from database
      const documentIds = await getUserDocumentIds(userId);
      console.log('[DocumentSearch] Found document IDs:', documentIds.length, documentIds);

      if (documentIds.length === 0) {
        console.log('[DocumentSearch] No documents found for user');
        return {
          instructions: 'The user has no uploaded documents. Please let them know they need to upload documents first before you can search through them.',
          context: [],
          searchMetadata: {
            totalResults: 0,
            searchMethod: 'none',
            rerankingApplied: false
          }
        };
      }

      const toolQuery = query;
      const userMessage = messages[messages.length - 1].content;

      // Run hybrid search for both queries in parallel
      console.log('[DocumentSearch] Running hybrid search...');
      const [toolQueryResults, userMessageResults] = await Promise.all([
        hybridSearch(toolQuery, userId, documentIds, 30),
        hybridSearch(userMessage.toString(), userId, documentIds, 30)
      ]);
      console.log('[DocumentSearch] Tool query results:', toolQueryResults.length);
      console.log('[DocumentSearch] User message results:', userMessageResults.length);

      // Combine and deduplicate results
      const allSearchResults = [...toolQueryResults, ...userMessageResults];
      const seenKeys = new Set();
      const searchResults = allSearchResults.filter((item) => {
        const key = `${item.title}-${item.page}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // Sort by similarity/rerank score
      searchResults.sort((a, b) => b.similarity - a.similarity);

      // Build context array for client display and AI instructions
      const contextArray = searchResults.map((result) => {
        let content = result.text || '';

        // Truncate if content exceeds max characters
        if (content.length > MAX_CONTENT_CHARS) {
          content = content.slice(0, MAX_CONTENT_CHARS);
        }

        return {
          type: 'document',
          title: result.title,
          aiTitle: result.ai_title || undefined,
          page: result.page as number,
          totalPages: result.totalPages as number | undefined,
          content: content,
          pdfLink: `<?pdf=${result.title.trim()}&p=${result.page}>`,
          relevanceScore: result.rerankScore || result.similarity
        };
      });

      // Create instructions for the AI
      const instructions = `
Based on the content from the found documents, provide a concise and accurate answer to the user's question.

IMPORTANT: Each time you use information from the documents, you must add a reference in Markdown link format:
[Short description](<?pdf=Document_title&p=X>)

Good examples of link text:
- [Section 12 of the law](<?pdf=Document_title&p=8>)
- [Figure 3.2](<?pdf=Document_title&p=15>)
- [Definition of the concept](<?pdf=Document_title&p=2>)

If no relevant information is found, inform the user and suggest rephrasing the question.
Answer in the same language as the user's question.

Found documents (sorted by relevance):
${contextArray.slice(0, 10).map((doc, i) => `${i + 1}. ${doc.aiTitle || doc.title} (page ${doc.page}) - Relevance: ${((doc.relevanceScore || 0) * 100).toFixed(1)}%`).join('\n')}
`;

      return {
        instructions: instructions,
        context: contextArray,
        searchMetadata: {
          totalResults: searchResults.length,
          searchMethod: 'hybrid_search_with_rrf',
          rerankingApplied: !!process.env.COHERE_API_KEY
        }
      };
    }
  });
