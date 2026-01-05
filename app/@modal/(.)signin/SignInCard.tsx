'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText } from 'lucide-react';
import ForgotPassword from '../ForgotPassword';
import OAuthButtons from '../OAuthButtons';
import { login } from '../action';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

export default function SignInCard() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  const [alertMessage, setAlertMessage] = useState({
    type: '',
    message: ''
  });

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (validateInputs(email, password)) {
      const result = await login(formData);

      setAlertMessage({
        type: result.success ? 'success' : 'error',
        message: result.message
      });

      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        router.back();
      }
    }
  };

  const validateInputs = (email: string, password: string) => {
    let isValid = true;
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }
    if (!password.trim()) {
      setPasswordError(true);
      setPasswordErrorMessage('Password is required.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }
    return isValid;
  };

  return (
    <div className="flex justify-center items-center">
      <div className="w-full sm:w-[350px]">
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-card via-card to-card/80 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Welcome back</h1>
                <p className="text-xs text-muted-foreground">Sign in to DocuLens AI</p>
              </div>
            </div>
          </div>

          <CardContent className="p-4 pt-3 space-y-3">
            <form action={handleSubmit} noValidate className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                  className={`h-9 ${emailError ? 'border-destructive' : ''}`}
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('rememberedEmail') || '' : ''}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailErrorMessage}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <ForgotPassword />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••"
                  autoComplete="current-password"
                  required
                  className={`h-9 ${passwordError ? 'border-destructive' : ''}`}
                />
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordErrorMessage}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="remember-me" className="text-xs">
                  Remember me
                </Label>
              </div>

              <SubmitButton />

              {alertMessage.type && (
                <Alert
                  variant={alertMessage.type === 'error' ? 'destructive' : 'default'}
                  className="py-2"
                >
                  <AlertDescription className="text-sm">{alertMessage.message}</AlertDescription>
                </Alert>
              )}

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <OAuthButtons />

              <div className="flex justify-center">
                <Button asChild variant="outline" className="w-auto h-9 text-sm">
                  <Link href="/signup" replace>
                    Don&apos;t have an account? <span className="text-primary ml-1 font-semibold">Sign up</span>
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full h-9" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
    </Button>
  );
}
