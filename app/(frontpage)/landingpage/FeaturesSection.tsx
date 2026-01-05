'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import {
  Zap,
  Shield,
  FileText,
  MessageSquare,
  Clock,
  Languages,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Answers',
    description:
      'Ask any question and get accurate answers in seconds. No more ctrl+F or manual searching through documents.',
  },
  {
    icon: Shield,
    title: 'Source Citations',
    description:
      'Every answer comes with page numbers and quotes. Verify information instantly by clicking through to the source.',
  },
  {
    icon: FileText,
    title: 'Any PDF Document',
    description:
      'Research papers, legal contracts, technical manuals, textbooks—upload any PDF and start chatting immediately.',
  },
  {
    icon: MessageSquare,
    title: 'Natural Conversations',
    description:
      'Ask follow-up questions, request clarifications, or dive deeper into topics. It remembers your conversation context.',
  },
  {
    icon: Clock,
    title: 'Save Hours of Work',
    description:
      'What used to take hours of reading now takes minutes. Perfect for research, due diligence, or studying.',
  },
  {
    icon: Languages,
    title: 'Multiple AI Models',
    description:
      'Choose from GPT-5, Claude, or Gemini based on your needs. Different models for different tasks.',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to work smarter
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop wasting time searching through documents. Get the information you need, when you need it.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div key={index} variants={item}>
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};
