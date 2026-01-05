import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import { embed } from 'ai';
import { voyage } from 'voyage-ai-provider';
import { createServerSupabaseClient } from '@/lib/server/server';

// Define the state using Annotation
const RAGState = Annotation.Root({
  question: Annotation<string>,
  rewrittenQuestion: Annotation<string | null>,
  documents: Annotation<Document[]>,
  relevanceScore: Annotation<number>,
  retryCount: Annotation<number>,
  generation: Annotation<string>,
  userId: Annotation<string>,
  documentIds: Annotation<string[]>
});

interface Document {
  id: string;
  text: string;
  title: string;
  page: number;
  totalPages: number;
  similarity: number;
  ai_title?: string;
}

const embeddingModel = voyage.textEmbeddingModel('voyage-3-large');

// Embed query function
async function embedQuery(text: string) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions: {
      voyage: {
        inputType: 'query',
        truncation: false,
        outputDimension: 1024,
        outputDtype: 'int8'
      }
    }
  });
  return embedding;
}

// Query Supabase vectors
async function querySupabaseVectors(
  queryEmbedding: number[],
  userId: string,
  documentIds: string[],
  topK: number,
  similarityThreshold: number
): Promise<Document[]> {
  const supabase = await createServerSupabaseClient();
  const embeddingString = `[${queryEmbedding.join(',')}]`;

  const { data: matches, error } = await supabase.rpc('match_documents', {
    query_embedding: embeddingString,
    match_count: topK,
    filter_user_id: userId,
    file_ids: documentIds,
    similarity_threshold: similarityThreshold
  });

  if (error) {
    console.error('Error querying vectors:', error);
    throw error;
  }

  return matches.map((match: Record<string, unknown>) => ({
    id: match.id as string,
    text: match.text_content as string,
    title: match.title as string,
    page: match.page_number as number,
    totalPages: match.total_pages as number,
    similarity: match.similarity as number,
    ai_title: match.ai_title as string | undefined
  }));
}

// Node: Retrieve documents
async function retrieveDocuments(state: typeof RAGState.State): Promise<Partial<typeof RAGState.State>> {
  const query = state.rewrittenQuestion || state.question;
  const queryEmbedding = await embedQuery(query);

  const documents = await querySupabaseVectors(
    queryEmbedding,
    state.userId,
    state.documentIds,
    30,
    0.3
  );

  return { documents };
}

// Node: Grade documents for relevance
async function gradeDocuments(state: typeof RAGState.State): Promise<Partial<typeof RAGState.State>> {
  const { documents, question } = state;

  if (documents.length === 0) {
    return { relevanceScore: 0 };
  }

  // Calculate average similarity score
  const avgSimilarity = documents.reduce((sum, doc) => sum + doc.similarity, 0) / documents.length;

  // Check if top documents have good similarity (threshold: 0.5)
  const topDocsRelevant = documents.slice(0, 5).filter(doc => doc.similarity > 0.5).length;

  // Relevance score based on both average similarity and top docs quality
  const relevanceScore = (avgSimilarity * 0.5) + ((topDocsRelevant / 5) * 0.5);

  return { relevanceScore };
}

// Node: Rewrite query for better retrieval
async function rewriteQuery(state: typeof RAGState.State): Promise<Partial<typeof RAGState.State>> {
  const { question, retryCount } = state;

  // Simple query expansion - add context hints
  const expansions = [
    `${question} (detailed explanation)`,
    `${question} (specific information and context)`,
    `${question} (relevant sections and references)`
  ];

  const rewrittenQuestion = expansions[retryCount] || question;

  return {
    rewrittenQuestion,
    retryCount: retryCount + 1
  };
}

// Conditional edge: Decide whether to regenerate or proceed
function shouldRetrieve(state: typeof RAGState.State): 'rewrite' | 'output' {
  // If relevance is low and we haven't retried too many times, rewrite query
  if (state.relevanceScore < 0.4 && state.retryCount < 2) {
    return 'rewrite';
  }
  return 'output';
}

// Node: Output results
async function outputResults(state: typeof RAGState.State): Promise<Partial<typeof RAGState.State>> {
  // Documents are already retrieved and graded, just pass through
  return {};
}

// Build the LangGraph workflow
function createRAGGraph() {
  const workflow = new StateGraph(RAGState)
    .addNode('retrieve', retrieveDocuments)
    .addNode('grade', gradeDocuments)
    .addNode('rewrite', rewriteQuery)
    .addNode('output', outputResults)
    .addEdge(START, 'retrieve')
    .addEdge('retrieve', 'grade')
    .addConditionalEdges('grade', shouldRetrieve, {
      rewrite: 'rewrite',
      output: 'output'
    })
    .addEdge('rewrite', 'retrieve')
    .addEdge('output', END);

  return workflow.compile();
}

// Export the compiled graph
export const ragGraph = createRAGGraph();

// Main function to run the RAG workflow
export async function runRAGWorkflow(
  question: string,
  userId: string,
  documentIds: string[]
): Promise<{
  documents: Document[];
  relevanceScore: number;
  retryCount: number;
  rewrittenQuestion: string | null;
}> {
  const initialState = {
    question,
    rewrittenQuestion: null,
    documents: [],
    relevanceScore: 0,
    retryCount: 0,
    generation: '',
    userId,
    documentIds
  };

  const finalState = await ragGraph.invoke(initialState);

  return {
    documents: finalState.documents,
    relevanceScore: finalState.relevanceScore,
    retryCount: finalState.retryCount,
    rewrittenQuestion: finalState.rewrittenQuestion
  };
}
