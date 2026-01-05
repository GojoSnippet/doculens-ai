'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Search, MessageSquare, CheckCircle } from 'lucide-react';

interface HeroSectionProps {
  session: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ session }) => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                Stop searching. Start asking.
              </span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Chat with your{' '}
                <span className="text-primary">documents</span>
                <br />
                like never before
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Upload any PDF and get instant, accurate answers with page citations. 
                No more scrolling through hundreds of pages to find what you need.
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-8">
                {[
                  'Get answers in seconds, not hours',
                  'Every answer linked to the source page',
                  'Works with research papers, contracts, manuals & more',
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="h-12 px-6">
                  <Link href={session ? '/chat' : '/signup'}>
                    {session ? 'Go to Chat' : 'Get Started Free'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-6">
                  <Link href="#how-it-works">
                    See How It Works
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-card rounded-2xl border shadow-2xl p-6 overflow-hidden">
              {/* Mock Chat Interface */}
              <div className="space-y-4">
                {/* Document indicator */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">research-paper.pdf</span>
                  <span className="text-xs text-muted-foreground ml-auto">42 pages</span>
                </div>

                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                    <p className="text-sm">What are the main findings of this study?</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                    <p className="text-sm mb-2">
                      The study found three key results:
                    </p>
                    <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                      <li>Customer satisfaction increased by 34%</li>
                      <li>Response times reduced from 48h to 2h</li>
                      <li>Cost savings of $2.3M annually</li>
                    </ol>
                    <div className="flex items-center gap-1 mt-3 text-xs text-primary">
                      <Search className="w-3 h-3" />
                      <span>Source: Page 12, 15, 23</span>
                    </div>
                  </div>
                </div>

                {/* Typing indicator */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">Ask any question about your document...</span>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
