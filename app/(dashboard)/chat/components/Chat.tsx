'use client';

import React, { useState, useOptimistic, startTransition, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { useParams } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { ChatScrollAnchor } from '../hooks/chat-scroll-anchor';
import { setModelSettings } from '../actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MemoizedMarkdown from './tools/MemoizedMarkdown';
import ReasoningContent from './tools/Reasoning';
import SourceView from './tools/SourceView';
import DocumentSearchTool from './tools/DocumentChatTool';
import { WebsiteSearchTool } from './tools/WebsiteSearchTool';
import MessageInput from './ChatMessageInput';
import { ParticleBackground } from './ParticleBackground';
import { Typewriter, TextReveal } from './TextAnimations';
import { toast } from 'sonner';
import { Bot, Copy, CheckCircle, FileIcon, FileText, Upload, MessageSquare, Sparkles, LogIn } from 'lucide-react';
import { type ToolUIPart, DefaultChatTransport } from 'ai';
import type { UITools } from '@/app/(dashboard)/chat/types/tooltypes';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ChatProps {
  currentChat?: UIMessage[];
  chatId: string;
  initialSelectedOption: string;
}

const ChatComponent: React.FC<ChatProps> = ({
  currentChat,
  chatId,
  initialSelectedOption
}) => {
  const param = useParams();
  const router = useRouter();
  const currentChatId = param.id as string;
  const { mutate } = useSWRConfig();

  // Check if user is logged in
  const { data: userData } = useSWR<{ isLoggedIn: boolean }>('/api/user-data', fetcher);
  const isLoggedIn = userData?.isLoggedIn ?? false;
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const [isCopied, setIsCopied] = useState(false);
  const [optimisticOption, setOptimisticOption] = useOptimistic<string, string>(
    initialSelectedOption,
    (_, newValue) => newValue
  );

  const handleOptionChange = async (newValue: string) => {
    startTransition(async () => {
      setOptimisticOption(newValue);
      await setModelSettings(newValue);
    });
  };

  const { messages, status, sendMessage, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat'
    }),
    generateId: () => crypto.randomUUID(),
    experimental_throttle: 50,
    messages: currentChat,
    onFinish: async () => {
      if (chatId !== currentChatId) {
        const currentSearchParams = new URLSearchParams(window.location.search);
        let newUrl = `/chat/${chatId}`;
        if (currentSearchParams.toString()) {
          newUrl += `?${currentSearchParams.toString()}`;
        }
        router.push(newUrl, { scroll: false });
      }
      await mutate((key) => Array.isArray(key) && key[0] === 'chatPreviews');
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || 'An error occurred');
    }
  });

  const getMessageContent = (message: UIMessage) => {
    return (
      message.parts
        ?.filter((part) => part.type === 'text')
        ?.map((part) => part.text)
        ?.join('') || ''
    );
  };

  const copyToClipboard = (str: string) => {
    window.navigator.clipboard.writeText(str);
  };

  const handleCopy = (content: string) => {
    copyToClipboard(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1000);
  };

  // Wrap sendMessage to check authentication first
  const handleSendMessage = useCallback(
    async (message: Parameters<typeof sendMessage>[0]) => {
      if (!isLoggedIn) {
        setShowAuthDialog(true);
        return;
      }
      return sendMessage(message);
    },
    [isLoggedIn, sendMessage]
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-y-auto bg-slate-900 relative">
      {/* Particle Background - only on welcome screen */}
      {messages.length === 0 && <ParticleBackground />}
      
      {messages.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-[85vh] text-center px-4 relative z-10">
          {/* Animated Icon */}
          <div className="mb-8 opacity-0 animate-bounce-in">
            <div className="h-20 w-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center animate-float animate-pulse-glow">
              <FileText className="h-10 w-10 text-emerald-500" />
            </div>
          </div>
          
          {/* Animated Title */}
          <h2 className="text-4xl md:text-5xl font-bold pb-4 tracking-tight">
            <TextReveal delay={200} className="text-slate-100">Chat with your </TextReveal>
            <TextReveal delay={400} className="gradient-text">documents</TextReveal>
          </h2>
          
          {/* Typewriter Description */}
          <div className="text-slate-400 pb-10 max-w-lg text-lg leading-relaxed h-14 opacity-0 animate-fade-in delay-600">
            <Typewriter 
              text="Upload a PDF and ask questions. Get instant, accurate answers powered by AI."
              delay={30}
            />
          </div>
          
          {/* Animated Feature pills */}
          <div className="flex flex-wrap gap-3 justify-center max-w-lg">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-500 text-sm font-medium hover:bg-slate-700 hover:scale-105 transition-all cursor-default opacity-0 animate-fade-in-up delay-500 hover-lift">
              <Upload className="h-4 w-4" />
              <span>Upload PDFs</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-500 text-sm font-medium hover:bg-slate-700 hover:scale-105 transition-all cursor-default opacity-0 animate-fade-in-up delay-600 hover-lift">
              <MessageSquare className="h-4 w-4" />
              <span>Ask Questions</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-500 text-sm font-medium hover:bg-slate-700 hover:scale-105 transition-all cursor-default opacity-0 animate-fade-in-up delay-700 hover-lift">
              <Sparkles className="h-4 w-4" />
              <span>Get AI Answers</span>
            </div>
          </div>
        </div>
      ) : (
        <ul className="flex-1 w-full mx-auto max-w-3xl px-4 py-6 space-y-4">
          {messages.map((message, index) => {
            const isUserMessage = message.role === 'user';

            const sources = message.parts?.filter(
              (part) =>
                (part.type === 'source-url' || part.type === 'source-document') &&
                !isUserMessage
            ) as Extract<
              (typeof message.parts)[number],
              { type: 'source-url' | 'source-document' }
            >[];

            return (
              <li 
                key={`${message.id}-${index}`} 
                className={`opacity-0 ${isUserMessage ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
                style={{ animationDelay: `${Math.min(index * 50, 300)}ms`, animationFillMode: 'forwards' }}
              >
                <div className={`flex gap-3 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                  {!isUserMessage && (
                    <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 self-start glow-hover transition-all">
                      <Bot className="h-5 w-5 text-emerald-500" />
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[80%] ${isUserMessage ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 transition-all hover:scale-[1.01] ${
                        isUserMessage
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 border border-slate-700 text-slate-100'
                      }`}
                    >
                      {message.parts?.map((part, partIndex) => {
                        const indexStr = `${message.id}-${partIndex}`;

                        if (part.type === 'text') {
                          return (
                            <div key={`part-${partIndex}`} className={isUserMessage ? 'font-medium' : ''}>
                              <MemoizedMarkdown
                                content={part.text}
                                id={`${isUserMessage ? 'user' : 'assistant'}-text-${message.id}-${partIndex}`}
                              />
                            </div>
                          );
                        }

                        if (part.type === 'reasoning' && !isUserMessage) {
                          return (
                            <div key={`part-${partIndex}`} className="mt-2">
                              <ReasoningContent details={part} messageId={message.id} />
                            </div>
                          );
                        }

                        if ((part.type === 'source-url' || part.type === 'source-document') && !isUserMessage) {
                          return null;
                        }

                        if (part.type === 'file' && isUserMessage) {
                          return (
                            <div key={`part-${partIndex}`} className="mt-2">
                              <div className="flex items-center gap-2 p-2 bg-primary-foreground/10 rounded">
                                <FileIcon className="h-4 w-4" />
                                <span className="text-sm">{part.filename || 'Attached File'}</span>
                              </div>
                            </div>
                          );
                        }

                        if (part.type === 'tool-searchUserDocument' && !isUserMessage) {
                          return (
                            <DocumentSearchTool
                              key={`part-${partIndex}`}
                              toolInvocation={part as Extract<ToolUIPart<UITools>, { type: 'tool-searchUserDocument' }>}
                              index={indexStr}
                            />
                          );
                        }

                        if (part.type === 'tool-websiteSearchTool' && !isUserMessage) {
                          return (
                            <WebsiteSearchTool
                              key={`part-${partIndex}`}
                              toolInvocation={part as Extract<ToolUIPart<UITools>, { type: 'tool-websiteSearchTool' }>}
                              index={indexStr}
                            />
                          );
                        }

                        return null;
                      })}
                    </div>

                    {!isUserMessage && (
                      <div className="flex items-center gap-2 mt-2">
                        {sources && sources.length > 0 && <SourceView sources={sources} />}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs opacity-60 hover:opacity-100"
                          onClick={() => handleCopy(getMessageContent(message))}
                        >
                          {isCopied ? (
                            <CheckCircle size={14} className="text-green-500 mr-1" />
                          ) : (
                            <Copy size={14} className="mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          <ChatScrollAnchor trackVisibility status={status} />
        </ul>
      )}

      <div className="sticky bottom-0 mt-auto max-w-[720px] mx-auto w-full z-5 pb-2">
        <MessageInput
          chatId={chatId}
          selectedOption={optimisticOption}
          handleOptionChange={handleOptionChange}
          sendMessage={handleSendMessage}
          status={status}
          stop={stop}
        />
      </div>

      {/* Sign In Dialog for unauthenticated users */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <LogIn className="h-5 w-5 text-emerald-500" />
              Sign in to continue
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a free account to chat with your documents and access all features.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Link href="/signin">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-800">
                Create Account
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatComponent;
