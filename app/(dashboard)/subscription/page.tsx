'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, Zap, Crown, Rocket } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <Card className="max-w-lg w-full text-center border-dashed border-2">
        <CardContent className="pt-12 pb-10 px-8">
          {/* Animated icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
              <Rocket className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">
            Something Amazing is Coming
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground mb-8">
            We're crafting premium features to supercharge your document experience. Stay tuned!
          </p>

          {/* Feature previews */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Faster Processing</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Crown className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-muted-foreground">Priority Support</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Advanced AI</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/chat">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Link>
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-muted-foreground mt-8">
            Currently enjoying the free tier with 5 documents and 100 messages/month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
