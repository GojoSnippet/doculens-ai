import 'server-only';
import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// Schema for chunk-level analysis (for each page/section)
const contentAnalysisSchema = z.object({
  preliminary_answer_1: z
    .string()
    .describe(
      'What is the main point or key information in this text? Provide a direct, factual answer.'
    ),
  preliminary_answer_2: z
    .string()
    .describe(
      'What specific details, numbers, dates, or facts are mentioned? List them concisely.'
    ),
  tags: z
    .array(z.string())
    .describe(
      'List 3-7 specific keywords that someone might search for to find this content. Include names, technical terms, and key concepts.'
    ),
  hypothetical_question_1: z
    .string()
    .describe(
      'What question would a user ask if they needed this specific information? Write as a natural question.'
    ),
  hypothetical_question_2: z
    .string()
    .describe(
      'What is another way someone might ask about this content? Use different wording.'
    )
});

export const preliminaryAnswerChainAgent = async (content: string) => {
  const SystemPrompt = `You are analyzing a document chunk for a RAG (Retrieval-Augmented Generation) system.

Your goal: Generate metadata that will help this chunk be FOUND when users search for relevant information.

Think about:
- What questions would someone ask if they needed this information?
- What keywords would they search for?
- What are the key facts, numbers, names, and dates?

Be SPECIFIC, not generic. Use actual terms from the text.

Example:
- BAD tag: "financial information"
- GOOD tag: "Q3 2024 revenue $4.2M"

- BAD question: "What does this document discuss?"
- GOOD question: "What was the company's revenue in Q3 2024?"`;

  const { object, usage } = await generateObject({
    model: openai('gpt-4o-mini'),
    system: SystemPrompt,
    prompt: content,
    schema: contentAnalysisSchema,
    abortSignal: AbortSignal.timeout(15000),
    temperature: 0.1  // Slight creativity for varied questions
  });

  return { object, usage };
};

// Schema for document-level metadata
const documentMetadataSchema = z.object({
  descriptiveTitle: z
    .string()
    .describe(
      'A clear, specific title for this document. Include key identifiers like dates, names, or document type. Example: "Employment Contract - John Smith - 2024" not just "Contract"'
    ),

  shortDescription: z
    .string()
    .describe(
      'A 2-3 sentence summary covering: 1) What type of document this is, 2) Who/what it concerns, 3) Key information it contains.'
    ),

  mainTopics: z
    .array(z.string())
    .describe(
      'List 3-5 main topics. Be specific. Example: ["employee termination policy", "severance package terms", "non-compete clause"] not ["HR", "policy", "legal"]'
    ),

  keyEntities: z
    .array(z.string())
    .describe(
      'List specific names, organizations, dates, amounts, and important terms mentioned. Example: ["Acme Corp", "John Smith", "March 15 2024", "$50,000", "Section 4.2"]'
    ),

  documentType: z
    .string()
    .describe(
      'The type of document: invoice, contract, resume, report, manual, letter, form, receipt, statement, other'
    ),

  primaryLanguage: z
    .string()
    .describe('The language: English, Spanish, French, etc.')
});

export const generateDocumentMetadata = async (content: string) => {
  const SystemPrompt = `You are analyzing a document for a RAG search system.

Generate metadata that will help users FIND and UNDERSTAND this document.

Rules:
1. Be SPECIFIC - use actual names, dates, amounts from the document
2. Think like a user - what would they search for?
3. Include document type - is this an invoice, contract, resume, report?
4. Extract key identifiers - invoice numbers, contract dates, person names

Example good metadata:
- Title: "National Grid Gas Bill - December 2024 - Account #12345"
- Description: "Monthly gas utility bill from National Grid for December 2024. Shows usage of 45 therms, total amount due $127.50, due date January 15 2025."
- Topics: ["gas utility bill", "December 2024 charges", "National Grid account"]
- Entities: ["National Grid", "Account #12345", "$127.50", "45 therms", "Jan 15 2025"]

Example BAD metadata:
- Title: "Utility Bill"
- Description: "A bill for utilities"
- Topics: ["bill", "utility", "payment"]
- Entities: ["company", "amount"]`;

  const { object, usage, finishReason } = await generateObject({
    model: openai('gpt-4o-mini'),
    system: SystemPrompt,
    prompt: content,
    schema: documentMetadataSchema,
    temperature: 0
  });

  return { object, usage, finishReason };
};