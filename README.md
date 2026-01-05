# DocuLens AI

**Intelligent Document Assistant powered by RAG**

Chat with your documents using advanced AI. Upload PDFs, ask questions, get answers with citations.

![DocuLens AI](public/images/hero-preview.png)

## Features

- **Document Chat** - Ask questions about your uploaded PDFs and get answers with page citations
- **Hybrid Search** - Combines vector embeddings + keyword search + reranking for accurate retrieval
- **Multi-Model Support** - GPT-5, Claude 4 Sonnet, Gemini 3 Pro, O3, and more
- **Web Search** - AI can search the web when your documents don't have the answer
- **Usage Tracking** - Monitor documents, messages, and storage usage per user
- **Dark/Light Mode** - Beautiful UI that respects your system preferences

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Auth & Database**: Supabase (Auth, PostgreSQL, Storage)
- **AI**: Vercel AI SDK with OpenAI, Anthropic, Google providers
- **PDF Processing**: LlamaCloud for markdown extraction
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Reranking**: Cohere `rerank-english-v3.0` (optional)
- **UI**: shadcn/ui + Tailwind CSS

## Screenshots

### Landing Page
![Landing Page](public/images/image1.png)

### Chat Interface
![Chat Interface](public/images/image7.png)

### Document Search with Citations
![RAG Chat](public/images/image8.png)

### File Management
![File Management](public/images/image4.png)

### Account Settings
![Account Settings](public/images/image9.png)

## Quick Start

### Prerequisites

- Node.js 18+
- [Supabase](https://supabase.com) account
- [OpenAI API Key](https://platform.openai.com)
- [LlamaCloud API Key](https://cloud.llamaindex.ai) (for PDF parsing)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/doculens-ai.git
cd doculens-ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Models
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key

# Document Processing
LLAMA_CLOUD_API_KEY=your_llamacloud_key

# Optional - Reranking
COHERE_API_KEY=your_cohere_key
```

## Database Setup

Run the SQL in `database/setup.sql` in your Supabase SQL Editor. This creates:

- Users table with auth trigger
- Chat sessions and message parts tables
- Document storage with vector embeddings
- RLS policies for security
- `match_documents` function for similarity search

### Vector Configuration

The app uses:
- **Embedding Model**: `text-embedding-3-small` (1536 dimensions)
- **Index**: HNSW with `m=16`, `ef_construction=64`
- **Distance**: Cosine similarity via `<=>` operator

## Storage Setup

1. Create a bucket named `userfiles` in Supabase Storage
2. Set it to **private**
3. Apply the RLS policies from `database/setup.sql`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Important Notes

- Set `maxDuration` for API routes (60s for Pro tier)
- Configure Supabase URL allowlist for your domain
- Enable CORS in Supabase if needed

## Project Structure

```
app/
├── (dashboard)/          # Authenticated routes
│   ├── chat/            # AI chat interface
│   │   ├── [id]/        # Individual chat sessions
│   │   └── components/  # Chat UI components
│   ├── filer/           # File management
│   └── profile/         # Account settings
├── (frontpage)/         # Public landing page
└── api/
    ├── chat/            # Chat API with tools
    │   └── tools/       # documentChat, websiteSearch
    ├── processdoc/      # PDF processing pipeline
    ├── uploaddoc/       # LlamaCloud upload
    └── checkdoc/        # Job status polling
```

## How Document Search Works

1. **Upload**: PDF sent to LlamaCloud for markdown extraction
2. **Process**: AI generates metadata (title, description, topics, entities)
3. **Embed**: Each page embedded with OpenAI + metadata
4. **Search**: Hybrid search (vector + keyword + RRF fusion)
5. **Rerank**: Optional Cohere reranking for accuracy
6. **Cite**: AI responds with `[text](<?pdf=Title&p=N>)` citations

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with Next.js, Supabase, and Vercel AI SDK.
