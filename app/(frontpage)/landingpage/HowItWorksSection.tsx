'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, MessageSquare } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload your documents',
    description:
      'Drag and drop any PDF—research papers, contracts, manuals, or textbooks. We handle the rest.',
  },
  {
    number: '02',
    icon: Search,
    title: 'AI processes and indexes',
    description:
      'Your document is parsed, chunked, and indexed in seconds. Complex tables and layouts are preserved.',
  },
  {
    number: '03',
    icon: MessageSquare,
    title: 'Ask anything',
    description:
      'Chat naturally with your document. Get instant answers with citations pointing to exact pages.',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From upload to answers in three simple steps
          </p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-border" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center relative"
                >
                  {/* Step number circle */}
                  <div className="relative z-10 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6 text-sm font-bold">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-muted-foreground" />
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
