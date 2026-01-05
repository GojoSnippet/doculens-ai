'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Upload, MessageSquare } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const CTASection: React.FC = () => {
  const { data: userData } = useSWR<{
    isLoggedIn: boolean;
  }>('/api/user-data', fetcher);

  const isLoggedIn = userData?.isLoggedIn ?? false;

  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            {isLoggedIn ? (
              <MessageSquare className="w-8 h-8 text-primary" />
            ) : (
              <Upload className="w-8 h-8 text-primary" />
            )}
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isLoggedIn
              ? 'Continue chatting with your documents'
              : 'Ready to chat with your documents?'}
          </h2>

          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            {isLoggedIn
              ? 'Pick up where you left off or start a new conversation.'
              : 'Upload your first PDF and start getting answers in under a minute. No credit card required.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link href="/chat">
                    Open Chat
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/filer">My Files</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link href="/signup">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/chat">Try AI Chat</Link>
                </Button>
              </>
            )}
          </div>

          {!isLoggedIn && (
            <p className="text-sm text-muted-foreground mt-6">
              Free tier includes 5 documents and 100 messages per month
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};
