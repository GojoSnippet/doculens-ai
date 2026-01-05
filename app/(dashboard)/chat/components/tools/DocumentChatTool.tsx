import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { ToolUIPart } from 'ai';
import type { UITools } from '@/app/(dashboard)/chat/types/tooltypes';
import Link from 'next/link';

// Client-side base64 encoding for URLs
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

interface DocumentChatToolProps {
  toolInvocation: Extract<
    ToolUIPart<UITools>,
    { type: 'tool-searchUserDocument' }
  >;
  index: string;
}

const DocumentChatTool: React.FC<DocumentChatToolProps> = ({
  toolInvocation
}) => {
  const output = toolInvocation.output;

  // Extract document sources from output context
  const getSources = () => {
    if (!output?.context || !Array.isArray(output.context)) return [];
    return output.context.filter((item: any) => item.type === 'document');
  };

  // Get unique pages sorted
  const getUniquePages = () => {
    const sources = getSources();
    const pageMap = new Map<number, { page: number; title: string }>();

    for (const source of sources) {
      if (!pageMap.has(source.page)) {
        pageMap.set(source.page, { page: source.page, title: source.title });
      }
    }

    return Array.from(pageMap.values()).sort((a, b) => a.page - b.page);
  };

  const sources = getSources();
  const uniquePages = getUniquePages();

  // Loading state
  if (toolInvocation.state === 'input-streaming' || toolInvocation.state === 'input-available') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 my-1">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Searching documents...</span>
      </div>
    );
  }

  // No results or error
  if (toolInvocation.state === 'output-error' || sources.length === 0) {
    return null;
  }

  // Success - show simple "Source: Page X, Y, Z" format
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400 my-1">
      <Search className="h-4 w-4 flex-shrink-0" />
      <span>Source: Page</span>
      {uniquePages.slice(0, 10).map((item, idx) => (
        <React.Fragment key={item.page}>
          {idx > 0 && <span>,</span>}
          <Link
            href={`?pdf=${encodeBase64(item.title)}&p=${item.page}`}
            className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
            prefetch={false}
          >
            {item.page}
          </Link>
        </React.Fragment>
      ))}
      {uniquePages.length > 10 && (
        <span className="text-slate-500">+{uniquePages.length - 10} more</span>
      )}
    </div>
  );
};

export default DocumentChatTool;
