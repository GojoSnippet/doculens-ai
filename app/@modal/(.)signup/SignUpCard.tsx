'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles } from 'lucide-react';
import { signup } from '../action';
import OAuthButtons from '../OAuthButtons';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

export default function SignUpCard() {
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  const [alertMessage, setAlertMessage] = useState<{
    type: 'error' | 'success' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (validateInputs(email, password)) {
      const result = await signup(formData);

      setAlertMessage({
        type: result.success ? 'success' : 'error',
        message: result.message
      });

      setTimeout(() => {
        setAlertMessage({ type: null, message: '' });
      }, 5000);
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

    if (!password.trim() || password.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 6 characters.');
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
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Get Started</h1>
                <p className="text-xs text-muted-foreground">Create your DocuLens AI account</p>
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
                  className={`h-9 ${emailError ? 'border-destructive' : 'border-input/50 focus:border-primary'}`}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailErrorMessage}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  name="password"
                  placeholder="••••••"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  required
                  className={`h-9 ${passwordError ? 'border-destructive' : ''}`}
                />
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordErrorMessage}</p>
                )}
              </div>

              <SubmitButton />

              {alertMessage.type && (
                <Alert
                  variant={alertMessage.type === 'error' ? 'destructive' : 'default'}
                  className={`py-2 ${
                    alertMessage.type === 'success'
                      ? 'border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 dark:border-green-800'
                      : ''
                  }`}
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
                  <Link href="/signin" replace>
                    Already have an account?
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
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
    </Button>
  );
}
