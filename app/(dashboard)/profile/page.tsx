import 'server-only';
import { getUserInfo } from '@/lib/server/supabase';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Calendar, LogOut, KeyRound, Sparkles, FileText, MessageSquare, HardDrive, Crown } from 'lucide-react';
import { signOut, requestPasswordReset } from './actions';
import { createServerSupabaseClient } from '@/lib/server/server';
import { getUserUsage, formatBytes, getUsagePercentage } from '@/lib/server/usage';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default async function ProfilePage() {
  const userInfo = await getUserInfo();
  if (!userInfo) {
    redirect('/');
  }

  // Get user metadata for created_at
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const createdAt = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Unknown';

  // Get usage stats
  const usage = await getUserUsage();

  const initials = userInfo.full_name
    ? userInfo.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : userInfo.email?.charAt(0).toUpperCase() || 'U';

  const planDisplayName = {
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise'
  }[usage?.plan || 'free'];

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

        {/* Usage & Plan Card */}
        <Card className="mb-6 border-0 shadow-xl glass animate-fade-in-up hover-lift overflow-hidden">
          <CardHeader className="pt-4 pb-2">
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 gradient-text text-2xl font-extrabold animate-gradient">
                  <Sparkles className="w-6 h-6 animate-float shrink-0" />
                  <span>Usage & Plan</span>
                </CardTitle>
                <CardDescription className="text-base mt-1">Your current usage and plan limits</CardDescription>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-400/80 to-emerald-600/80 text-primary-foreground text-lg font-bold shadow-lg animate-pulse-glow shrink-0">
                <Crown className="w-5 h-5 animate-bounce-in" />
                {planDisplayName}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2 pb-4 px-4">
            {usage && (
              <>
                {/* Documents */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-base font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-5 h-5 text-emerald-400 animate-float delay-100 shrink-0" />
                      <span className="truncate">Documents</span>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {usage.usage.documents} / {usage.limits.max_documents === -1 ? '∞' : usage.limits.max_documents}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(usage.usage.documents, usage.limits.max_documents)}
                    className="h-3 bg-muted animate-fade-in-up"
                  />
                </div>

                {/* Messages */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-base font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-5 h-5 text-emerald-400 animate-float delay-200 shrink-0" />
                      <span className="truncate">Messages this month</span>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {usage.usage.messages} / {usage.limits.max_messages_per_month === -1 ? '∞' : usage.limits.max_messages_per_month}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(usage.usage.messages, usage.limits.max_messages_per_month)}
                    className="h-3 bg-muted animate-fade-in-up"
                  />
                </div>

                {/* Storage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-base font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <HardDrive className="w-5 h-5 text-emerald-400 animate-float delay-300 shrink-0" />
                      <span className="truncate">Storage</span>
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatBytes(usage.usage.storage_bytes)} / {usage.limits.max_storage_bytes === -1 ? '∞' : formatBytes(usage.limits.max_storage_bytes)}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(usage.usage.storage_bytes, usage.limits.max_storage_bytes)}
                    className="h-3 bg-muted animate-fade-in-up"
                  />
                </div>

                <Separator />

                {/* Upgrade Button with Tooltip */}
                <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="min-w-0">
                    <p className="text-base font-semibold">Want more?</p>
                    <p className="text-xs text-muted-foreground">Upgrade for more documents, messages & storage</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button disabled className="gap-2 relative overflow-hidden group bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold px-6 py-2 rounded-xl shadow-lg hover-lift shrink-0">
                            <Crown className="w-5 h-5 shrink-0" />
                            <span>Upgrade Plan</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={8} className="bg-emerald-700 text-white font-semibold">
                        Coming Soon: Pro & Enterprise plans
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pt-4 pb-2">
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4 px-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16 text-lg shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold truncate">{userInfo.full_name || 'No name set'}</h2>
                <p className="text-muted-foreground truncate">{userInfo.email}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium break-words">{userInfo.full_name || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium break-all">{userInfo.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{createdAt}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pt-4 pb-2">
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and session</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-4 px-4">
            <form action={requestPasswordReset}>
              <input type="hidden" name="email" value={userInfo.email || ''} />
              <Button variant="outline" className="w-full justify-start gap-2" type="submit">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Change Password</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <form action={signOut}>
          <Button variant="destructive" className="w-full gap-2" type="submit">
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
