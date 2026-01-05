'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft, Palette, Bell, Shield } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <Card className="max-w-lg w-full text-center border-dashed border-2">
        <CardContent className="pt-12 pb-10 px-8">
          {/* Animated icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
              <Settings className="w-10 h-10 text-primary animate-[spin_8s_linear_infinite]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">
            Settings Coming Soon
          </h1>

          {/* Subtitle */}
          <p className="text-muted-foreground mb-8">
            We're building powerful customization options to make DocuLens truly yours.
          </p>

          {/* Feature previews */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Palette className="w-5 h-5 text-pink-500" />
              <span className="text-xs text-muted-foreground">Themes</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Bell className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-muted-foreground">Notifications</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-xs text-muted-foreground">Privacy</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/profile">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
