// ModalWrapper.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ModalWrapperProps {
  children: React.ReactNode;
}

export default function ModalWrapper({ children }: ModalWrapperProps) {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={() => router.back()}>
      <DialogContent
        className="max-h-[95vh] w-[95%] sm:max-w-[90%] md:max-w-[90%] lg:max-w-[1000px]
           my-1 p-3 sm:p-4 md:p-4 pt-8
           bg-background
           shadow-lg rounded-lg
           overflow-y-auto"
      >
        <DialogTitle className="sr-only">Sign in</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
