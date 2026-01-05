import { type NextRequest, NextResponse } from 'next/server';
import type { UIMessage } from 'ai';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { saveMessagesToDB } from './SaveToDbIncremental';
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { openai } from '@ai-sdk/openai';
import type { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { anthropic } from '@ai-sdk/anthropic';
import { getSession } from '@/lib/server/supabase';
import { createServerSupabaseClient } from '@/lib/server/server';
import { searchUserDocument } from './tools/documentChat';
import { google } from '@ai-sdk/google';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import type { SharedV2ProviderMetadata } from '@ai-sdk/provider';
import { websiteSearchTool } from './tools/WebsiteSearchTool';
import { checkUsageLimit, incrementUsage } from '@/lib/server/usage';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

const systemPrompt = `You are an intelligent document assistant powered by RAG (Retrieval-Augmented Generation). Your primary role is to help users understand and extract insights from their uploaded documents.

## CORE BEHAVIOR

1. **Document-First Approach**: When users ask about their documents, ALWAYS use the searchUserDocument tool first. Never guess or use general knowledge for document-specific questions.

2. **Be Specific**: Reference exact sections, page numbers, and quotes from documents.

3. **Admit Limitations**: If a document doesn't contain the requested information, say so clearly. Never hallucinate.

## TOOLS

- **searchUserDocument**: Search user's uploaded PDFs
- **websiteSearchTool**: Search the web for external information

## CITATION FORMAT (REQUIRED)

Always cite document sources:
[Description](<?pdf=Document_Title&p=PAGE_NUMBER>)

Examples:
- [Total amount due](<?pdf=Invoice_2024&p=1>)
- [Termination clause](<?pdf=Contract&p=8>)

## EDGE CASES - HANDLE THESE PROPERLY

### No Documents Uploaded
If searchUserDocument returns empty or "no documents":
→ "You haven't uploaded any documents yet. Go to File Management to upload PDFs, then I can search through them."

### Search Returns No Results  
If search finds nothing relevant:
→ "I searched your documents but couldn't find information about [topic]. This might mean:
   - The information isn't in your uploaded documents
   - Try rephrasing your question
   - Upload additional documents that might contain this information"

### Search Returns Irrelevant Results
If results don't match the question:
→ "I found some documents but they don't seem to contain specific information about [topic]. Could you:
   - Clarify what you're looking for?
   - Tell me which document should have this information?"

### Multiple Documents - User Needs to Specify
If user has many documents and question is ambiguous:
→ "You have multiple documents. Which one are you asking about?
   - [List document names if available]
   Or I can search across all of them."

### Ambiguous Questions
If question is unclear:
→ Ask ONE clarifying question. Don't assume.

### Multi-Language Documents
→ Respond in the same language as the user's question
→ If document is in different language, translate relevant parts

### Tables/Structured Data
If document contains tables or charts:
→ Format response with markdown tables when presenting tabular data
→ Note: "This data comes from a table on page X"

### User Asks to Compare Documents
→ Search both documents, present side-by-side comparison

### Follow-up Questions
→ Use conversation context, but re-search if needed for accuracy

### Mixed Queries (Document + General Knowledge)
If question needs both document info AND external knowledge:
→ Use searchUserDocument for document parts
→ Use websiteSearchTool or your knowledge for external parts
→ Clearly separate: "From your document: [X]. Additionally: [Y]"

### Outdated Document Information
If document info might be outdated (dates, prices, laws):
→ "Your document from [date] states [X]. Note: This may have changed. Want me to search for current information?"

### Conflicting Information Across Documents
If multiple documents say different things:
→ "I found conflicting information:
   - [Document A] says: [X]
   - [Document B] says: [Y]
   Which would you like me to use, or should I explain both?"

### Partial Information Available
If only part of the answer is in documents:
→ "Based on your documents, I found [X]. However, I couldn't find information about [Y]. Would you like me to search the web for that part?"

### User Asks to Edit/Modify Documents
→ "I can't edit your documents directly, but I can:
   - Suggest changes you could make
   - Help draft new content
   - Summarize what needs updating"

### Specific Page Requests
If user asks "What's on page 5?":
→ Search and summarize that specific page's content

### Full Document Summarization
If user asks for complete summary:
→ Search with broad terms, provide structured summary with key sections

### Very Long Answers Needed
→ Break into sections with headers
→ Offer to go deeper on specific parts

### Sensitive/Confidential Data
→ Never repeat full sensitive data (SSN, passwords, credit cards)
→ Reference it exists without exposing: "Your document contains [type of info] on page X"

### Document Processing Failed
If search tool returns error:
→ "There was an issue searching your documents. Please try:
   - Refreshing the page
   - Re-uploading the document
   - Using a smaller PDF file"

## RESPONSE FORMAT

**For document questions:**
1. Search first (don't mention you're searching)
2. Read results
3. Answer with inline citations
4. If incomplete, offer next steps

**For general questions:**
Answer directly, offer to relate to their documents if relevant

**For unclear questions:**
Ask ONE specific clarifying question

## TONE
- Professional but friendly
- Concise but thorough  
- Confident when certain, transparent when unsure

## NEVER DO THIS
- Say "I don't have access to your documents" (you do - use the tool)
- Provide generic answers when document content is available
- Skip citations when answering from documents
- Make up information not in documents
- Overwhelm user with multiple questions`;

function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

const getModel = (selectedModel: string) => {
  switch (selectedModel) {
    case 'claude-4-sonnet':
      return anthropic('claude-sonnet-4-5');
    case 'gpt-5':
      return openai('gpt-5.1');
    case 'gpt-5-mini':
      return openai('gpt-5-mini');
    case 'o3':
      return openai('o3-2025-04-16');
    case 'gemini-3-pro-preview':
      return google('gemini-3-pro-preview');
    case 'gemini-2.5-flash-preview-09-2025':
      return google('gemini-2.5-flash-preview-09-2025');
    default:
      console.error('Invalid model selected:', selectedModel);
      return openai('gpt-5.1');
  }
};

// GET - Fetch chat previews for sidebar
export async function GET(_req: NextRequest) {
  const user = await getSession();

  if (!user || !user.sub) {
    return NextResponse.json([], { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    
    // Fetch chats with first user message as fallback title
    const { data: chats, error } = await supabase
      .from('chat_sessions')
      .select(`
        id, 
        chat_title, 
        created_at,
        message_parts!chat_session_id (
          text_text,
          role
        )
      `)
      .eq('user_id', user.sub)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return NextResponse.json([], { status: 500 });
    }

    const chatPreviews = chats?.map((chat) => {
      // Get title from chat_title or first user message
      let title = chat.chat_title;
      if (!title) {
        const firstUserMessage = chat.message_parts?.find(
          (part: any) => part.role === 'user' && part.text_text
        );
        if (firstUserMessage?.text_text) {
          const rawTitle = firstUserMessage.text_text.trim();
          title = rawTitle.length > 50 
            ? rawTitle.substring(0, 50).trim() + '...'
            : rawTitle;
        }
      }
      
      return {
        chatId: chat.id,
        title: title || 'New Chat',
        createdAt: chat.created_at
      };
    }) || [];

    return NextResponse.json(chatPreviews);
  } catch (error) {
    console.error('Error in GET /api/chat:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// DELETE - Delete a chat session
export async function DELETE(req: NextRequest) {
  const user = await getSession();

  if (!user || !user.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    
    // Delete the chat session (messages will cascade delete)
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', chatId)
      .eq('user_id', user.sub);

    if (error) {
      console.error('Error deleting chat:', error);
      return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Check usage limit before processing
  const limitCheck = await checkUsageLimit('message');
  if (!limitCheck.allowed) {
    return new NextResponse(JSON.stringify({ 
      error: 'limit_reached',
      message: limitCheck.reason 
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const chatSessionId = body.chatId;
  const signal = body.signal;

  if (!chatSessionId) {
    return new NextResponse('Chat session ID is empty.', {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  const selectedModel = body.option ?? 'gpt-5';
  const userId = session.sub;

  const providerOptions: SharedV2ProviderMetadata = {};
  if (selectedModel === 'claude-4-sonnet') {
    providerOptions.anthropic = {
      thinking: { type: 'enabled', budgetTokens: 12000 }
    } satisfies AnthropicProviderOptions;
  }

  if (
    selectedModel === 'gemini-3-pro-preview' ||
    selectedModel === 'gemini-2.5-flash-preview-09-2025'
  ) {
    providerOptions.google = {
      thinkingConfig: {
        thinkingBudget: 2048,
        includeThoughts: true
      }
    } satisfies GoogleGenerativeAIProviderOptions;
  }

  if (selectedModel === 'o3') {
    providerOptions.openai = {
      reasoningEffort: 'high'
    } satisfies OpenAIResponsesProviderOptions;
  }

  if (selectedModel === 'gpt-5' || selectedModel === 'gpt-5-mini') {
    providerOptions.openai = {
      // Note: reasoningSummary requires org verification, disabled for compatibility
      // reasoningEffort: 'low',
      // reasoningSummary: 'auto',
    } satisfies OpenAIResponsesProviderOptions;
  }

  let stepCount = 0;
  let userMessageSaved = false;
  const assistantMessageId = crypto.randomUUID();

  const result = streamText({
    model: getModel(selectedModel),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    abortSignal: signal,
    providerOptions,
    tools: {
      websiteSearchTool: websiteSearchTool,
      searchUserDocument: searchUserDocument({ userId })
    },
    activeTools: ['websiteSearchTool', 'searchUserDocument'],
    stopWhen: stepCountIs(5),
    onStepFinish: async (stepResult) => {
      try {
        const messagesToSave: UIMessage[] = [];

        // On the first step, include the user message
        if (stepCount === 0 && !userMessageSaved) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage) {
            messagesToSave.push(lastMessage);
            userMessageSaved = true;
          }
        }

        // Build UIMessage from the step result content
        const uiMessage: UIMessage = {
          id: assistantMessageId,
          role: 'assistant',
          parts: []
        };

        // Add all content parts from the step
        stepResult.content.forEach((content) => {
          if (content.type === 'text') {
            uiMessage.parts.push({
              type: 'text',
              text: content.text,
              providerMetadata: content.providerMetadata
            });
          } else if (content.type === 'reasoning') {
            uiMessage.parts.push({
              type: 'reasoning',
              text: content.text,
              providerMetadata: content.providerMetadata
            });
          } else if (content.type === 'source') {
            if ('url' in content && 'title' in content) {
              uiMessage.parts.push({
                type: 'source-url',
                sourceId: content.id,
                url: content.url,
                title: content.title,
                providerMetadata: content.providerMetadata
              });
            } else if ('mediaType' in content && 'filename' in content) {
              uiMessage.parts.push({
                type: 'source-document',
                sourceId: content.id,
                mediaType: content.mediaType,
                title: content.title || '',
                filename: content.filename,
                providerMetadata: content.providerMetadata
              });
            }
          } else if (content.type === 'file') {
            uiMessage.parts.push({
              type: 'file',
              url: content.file.base64
                ? `data:${content.file.mediaType};base64,${content.file.base64}`
                : '',
              mediaType: content.file.mediaType,
              filename: undefined,
              providerMetadata: content.providerMetadata
            });
          } else if (content.type === 'tool-result') {
            uiMessage.parts.push({
              type: `tool-${content.toolName}`,
              toolCallId: content.toolCallId,
              state: 'output-available',
              input: content.input,
              output: content.output,
              providerExecuted: content.providerExecuted
            });
          } else if (content.type === 'tool-error') {
            uiMessage.parts.push({
              type: `tool-${content.toolName}`,
              toolCallId: content.toolCallId,
              state: 'output-error',
              input: content.input,
              errorText: content.error?.toString() || 'Tool error occurred',
              providerExecuted: content.providerExecuted
            });
          }
        });

        if (uiMessage.parts.length > 0) {
          messagesToSave.push(uiMessage);
        }

        // Save the messages from this step to the database
        if (messagesToSave.length > 0) {
          await saveMessagesToDB({
            chatSessionId,
            userId,
            messages: messagesToSave,
            isFirstStep: stepCount === 0,
            assistantMessageId
          });
          
          // Increment message usage count (only once per conversation turn)
          if (stepCount === 0) {
            await incrementUsage('message');
          }
        }

        // Increment step counter
        stepCount++;
      } catch (error) {
        console.error(`Error saving step ${stepCount} to database:`, error);
      }
    },
    onError: async (error) => {
      console.error('Error processing chat:', error);
    }
  });

  result.consumeStream();

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    onError: errorHandler
  });
}
