'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap,
  Scale,
  Microscope,
  Briefcase,
  BookOpen,
  HeartPulse,
} from 'lucide-react';

const useCases = [
  {
    icon: Microscope,
    title: 'Researchers',
    description:
      'Quickly find relevant findings across hundreds of papers. Never lose track of a citation again.',
    example: '"Find all papers that mention CRISPR gene editing efficiency rates"',
  },
  {
    icon: Scale,
    title: 'Legal Professionals',
    description:
      'Review contracts, find specific clauses, and compare document versions in minutes.',
    example: '"What are the termination conditions in this agreement?"',
  },
  {
    icon: GraduationCap,
    title: 'Students',
    description:
      'Study smarter by asking questions about textbooks and lecture notes.',
    example: '"Explain the key differences between TCP and UDP from Chapter 5"',
  },
  {
    icon: Briefcase,
    title: 'Business Analysts',
    description:
      'Extract insights from reports, whitepapers, and financial documents.',
    example: '"Summarize the revenue growth mentioned in Q3 earnings"',
  },
  {
    icon: BookOpen,
    title: 'Writers & Journalists',
    description:
      'Research faster by querying source documents and interview transcripts.',
    example: '"What statistics support the climate change argument in these sources?"',
  },
  {
    icon: HeartPulse,
    title: 'Healthcare',
    description:
      'Navigate medical literature and clinical guidelines efficiently.',
    example: '"What dosage recommendations exist for pediatric patients?"',
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

export const UseCasesSection: React.FC = () => {
  return (
    <section id="use-cases" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for anyone who reads documents
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're a researcher, lawyer, student, or analyst—if you work with documents, DocuLens saves you time.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <motion.div key={index} variants={item}>
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{useCase.title}</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                          {useCase.description}
                        </p>
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground italic">
                        {useCase.example}
                      </p>
                    </div>
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
