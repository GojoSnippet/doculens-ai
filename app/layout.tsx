import { type ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-Inter'
});
export const metadata: Metadata = {
  metadataBase: new URL('https://doculens-ai.vercel.app/'),
  title: 'DocuLens AI - Intelligent Document Assistant',
  description:
    'Chat with your documents using advanced AI. Upload PDFs, ask questions, get answers with citations. Powered by RAG and hybrid search.'
};

export default async function RootLayout({
  children,
  modal
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors />
          {modal}
        </ThemeProvider>
      </body>
    </html>
  );
}
