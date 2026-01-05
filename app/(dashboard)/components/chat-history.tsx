'use client';

import { History, MessageSquare, Trash2 } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ChatPreview {
  chatId: string;
  title: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ChatHistory({ pathname }: { pathname: string }) {
  const { data, isLoading, mutate } = useSWR<ChatPreview[]>(
    ['chatPreviews', '/api/chat'],
    () => fetcher('/api/chat'),
    {
      revalidateOnFocus: true,
      refreshInterval: 3000,
      dedupingInterval: 1000
    }
  );

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/chat?chatId=${chatId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      mutate();
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const recentChats = data?.slice(0, 10) || [];

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2 text-slate-400">
        <History className="h-4 w-4 text-emerald-500/70" />
        Recent Chats
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-0.5">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <SidebarMenuItem key={i}>
                <div className="px-2 py-1.5">
                  <Skeleton className="h-4 w-full bg-slate-700" />
                </div>
              </SidebarMenuItem>
            ))}
          </>
        ) : recentChats.length === 0 ? (
          <SidebarMenuItem>
            <div className="px-2 py-2 text-xs text-slate-500 italic">
              No chat history yet
            </div>
          </SidebarMenuItem>
        ) : (
          recentChats.map((chat) => {
            const isActive = pathname === `/chat/${chat.chatId}`;
            return (
              <SidebarMenuItem 
                key={chat.chatId} 
                className="group"
              >
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={`pr-8 transition-colors ${isActive ? 'bg-emerald-500/10 border-l-2 border-emerald-500 text-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
                >
                  <Link href={`/chat/${chat.chatId}`}>
                    <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-500' : ''}`} />
                    <span className="truncate text-sm">{chat.title || 'New Chat'}</span>
                  </Link>
                </SidebarMenuButton>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                  onClick={(e) => handleDelete(chat.chatId, e)}
                >
                  <Trash2 className="h-3 w-3 text-slate-500 hover:text-red-500" />
                </Button>
              </SidebarMenuItem>
            );
          })
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
