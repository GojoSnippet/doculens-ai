import type { KeyboardEvent } from 'react';
import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// Browser-compatible base64 encoding for unicode strings
function encodeBase64Browser(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}
// Shadcn UI components
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { useChat } from '@ai-sdk/react';
import type { UIMessagePart } from 'ai';
import type { UITools } from '../types/tooltypes';
// Icons from Lucide React
import {
  Send,
  Loader2,
  ChevronDown,
  Paperclip,
  Square,
  X,
  FileIcon,
  Plus
} from 'lucide-react';
import Link from 'next/link';

// FilePreview component remains the same
const FilePreview = React.memo(
  ({ file, onRemove }: { file: File; onRemove: () => void }) => {
    const [previewUrl, setPreviewUrl] = useState<string>('');

    React.useEffect(() => {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }, [file]);

    return (
      <div className="group/thumbnail relative">
        <div
          className="rounded-lg overflow-hidden border-0.5 border-border-300/25 shadow-sm shadow-always-black/5 can-focus-within rounded-lg cursor-pointer hover:border-border-200/50 hover:shadow-always-black/10"
          style={{ width: 120, height: 120, minWidth: 120, minHeight: 120 }}
        >
          <div
            className="relative bg-bg-000"
            style={{ width: '100%', height: '100%' }}
          >
            {previewUrl && file.type === 'application/pdf' ? (
              <iframe
                src={previewUrl}
                title={`Preview of ${file.name}`}
                className="w-full h-full pointer-events-none"
                style={{
                  transform: 'scale(0.2)',
                  transformOrigin: 'top left',
                  width: '500%',
                  height: '500%'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <FileIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-0 right-0 px-2.5 overflow-x-hidden overflow-y-visible">
            <div className="relative flex flex-row items-center gap-1 justify-between">
              <div
                className="flex flex-row gap-1 shrink min-w-0"
                style={{ opacity: 1 }}
              >
                <div className="min-w-0 overflow-hidden h-[18px] flex flex-row items-center justify-center gap-0.5 px-1 border-0.5 border-border-300/25 shadow-sm rounded bg-bg-000/70 backdrop-blur-sm font-medium">
                  <p className="uppercase truncate font-styrene text-text-300 text-[11px] leading-[13px] overflow-hidden">
                    pdf
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="transition-all hover:bg-bg-000/50 text-text-500 hover:text-text-200 group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100 opacity-0 w-5 h-5 absolute -top-2 -left-2 rounded-full border-0.5 border-border-300/25 bg-bg-000/90 backdrop-blur-sm flex items-center justify-center"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }
);

FilePreview.displayName = 'FilePreview';

type ChatHelpers = ReturnType<typeof useChat>;

interface MessageInputProps {
  chatId: string;
  selectedOption: string;
  handleOptionChange: (value: string) => void;
  sendMessage: ChatHelpers['sendMessage'];
  status: ChatHelpers['status'];
  stop: ChatHelpers['stop'];
}

const MessageInput: React.FC<MessageInputProps> = ({
  chatId,
  selectedOption,
  handleOptionChange,
  sendMessage,
  status,
  stop
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [input, setInput] = useState('');

  // Background processing: upload file to storage and trigger document processing
  const processFileInBackground = useCallback(async (file: File) => {
    try {
      const fileName = file.name;
      const encodedFileName = encodeBase64Browser(fileName.trim());

      // Step 1: Get presigned URL
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: encodedFileName })
      });

      if (!presignedResponse.ok) {
        console.error('[ChatUpload] Failed to get presigned URL');
        return;
      }

      const { uploadUrl, filePath } = await presignedResponse.json();

      // Step 2: Upload file to Supabase Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadResponse.ok) {
        console.error('[ChatUpload] Failed to upload to storage');
        return;
      }

      // Step 3: Trigger LlamaCloud processing
      const uploaddocResponse = await fetch('/api/uploaddoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadedFiles: [{ name: fileName, path: filePath }]
        })
      });

      if (!uploaddocResponse.ok) {
        console.error('[ChatUpload] Failed to start document processing');
        return;
      }

      const uploaddocResult = await uploaddocResponse.json();
      const jobId = uploaddocResult.results?.[0]?.jobId;

      if (!jobId) {
        console.error('[ChatUpload] No job ID returned');
        return;
      }

      // Step 4: Poll for completion
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const checkResponse = await fetch('/api/checkdoc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId })
        });

        if (!checkResponse.ok) {
          attempts++;
          continue;
        }

        const checkResult = await checkResponse.json();

        if (checkResult.status === 'SUCCESS') {
          // Step 5: Process the document
          const processResponse = await fetch('/api/processdoc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, fileName })
          });

          if (processResponse.ok) {
            toast.success(`"${fileName}" added to your documents`);
          }
          return;
        } else if (checkResult.status === 'ERROR') {
          console.error('[ChatUpload] Processing failed');
          return;
        }

        attempts++;
      }
    } catch (error) {
      console.error('[ChatUpload] Background processing error:', error);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && event.shiftKey) {
      // Allow newline on Shift + Enter
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleFormSubmit(event);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('File is too large (max 3MB)');
      return;
    }

    setAttachedFiles((prev) => [...prev, file]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filesToBase64 = async (files: File[]) => {
    const promises = files.map((file) => {
      return new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve({
            type: 'file',
            filename: file.name,
            mediaType: file.type,
            url: base64
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    return Promise.all(promises);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;

    // REMOVED the router.push logic from here

    // Prepare message parts
    const parts: UIMessagePart<ChatHelpers, UITools>[] = [
      { type: 'text', text: input }
    ];

    // Add file parts if there are attachments
    if (attachedFiles.length > 0) {
      const fileParts = await filesToBase64(attachedFiles);
      parts.push(...fileParts);

      // Trigger background processing for each file (don't await)
      attachedFiles.forEach(file => {
        processFileInBackground(file);
      });
    }

    // Send message
    sendMessage(
      {
        role: 'user',
        parts: parts
      },
      {
        body: {
          chatId: chatId,
          option: selectedOption
        }
      }
    );

    // Clear input and files
    setInput('');
    setAttachedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <form
        onSubmit={handleFormSubmit}
        className="relative max-w-[720px] mx-auto mb-2 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:shadow-lg focus-within:shadow-emerald-500/10 hover:border-slate-600 group"
      >
        {/* Subtle shimmer effect on focus */}
        <div className="absolute inset-0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,application/pdf"
          className="hidden"
        />

        <Textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documents..."
          disabled={status !== 'ready'}
          className="w-full pt-4 pb-2 px-4 min-h-0 max-h-40 resize-none border-0 shadow-none focus:ring-0 focus-visible:ring-0 focus:outline-none bg-transparent placeholder:text-slate-500 text-slate-100"
          rows={1}
        />

        {/* Bottom controls row with buttons */}
        <div className="flex px-2.5 pb-2 pt-1 items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-between text-xs bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-300"
                  >
                    <span className="truncate">{selectedOption}</span>
                    <ChevronDown className="h-3 w-3 ml-2 flex-shrink-0 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700">
                  {[
                    { value: 'gpt-5', label: 'GPT-5' },
                    { value: 'gpt-5-mini', label: 'GPT-5 Mini' }
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleOptionChange(option.value)}
                      className={`text-xs ${
                        selectedOption === option.value
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Attach file button */}
            {attachedFiles.length === 0 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-9 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-700"
                disabled={status !== 'ready'}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            )}

            {/* New Chat button */}
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-700"
            >
              <Link href="/chat">
                <Plus className="w-5 h-5" />
              </Link>
            </Button>

            {/* Send button or spinner */}
            {status !== 'ready' && status !== 'error' ? (
              <div
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-700 cursor-pointer group relative overflow-hidden"
                onClick={stop}
              >
                <div className="absolute inset-0 bg-emerald-500/20 animate-pulse" />
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin group-hover:hidden relative z-10" />
                <Square size={14} className="text-red-500 hidden group-hover:block relative z-10" />
              </div>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() && attachedFiles.length === 0}
                className="h-9 w-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-30 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* File previews section */}
        {attachedFiles.length > 0 && (
          <div className="overflow-hidden border-t border-slate-700 bg-slate-800/50 rounded-b-2xl">
            <div className="flex flex-row overflow-x-auto gap-3 px-3.5 py-2.5">
              {attachedFiles.map((file, index) => (
                <FilePreview
                  key={file.name + index}
                  file={file}
                  onRemove={() => removeFile(index)}
                />
              ))}
            </div>
          </div>
        )}
      </form>
    </>
  );
};

export default MessageInput;
