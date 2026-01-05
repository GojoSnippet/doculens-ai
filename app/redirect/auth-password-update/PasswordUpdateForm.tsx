'use client';
import { useState, type FC, Suspense } from 'react';
import { resetPassword } from './action';
import { Lock, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import Message from './messages';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PasswordUpdateForm: FC = () => {
  const [error, setError] = useState<string>('');
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false
  });

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password)
    };
    setPasswordRequirements(requirements);
  };

  const handleSubmit = async (formData: FormData) => {
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Clear any previous errors
    setError('');

    // Check if the passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords must match.');
      return;
    }
    await resetPassword(formData);
  };

  return (
    <div className="flex justify-center items-center w-full max-w-[800px] mx-auto">
      <Card className="flex flex-col self-center rounded-2xl w-full sm:w-[350px] md:w-[500px]">
        <CardHeader className="pb-2">
          <CardTitle>Update Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={handleSubmit}
            noValidate
            className="flex flex-col w-full gap-y-2 md:gap-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  onChange={(e) => {
                    validatePassword(e.target.value);
                    if (error) setError('');
                  }}
                  autoComplete="new-password"
                  className="pl-10 py-5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  onChange={() => {
                    if (error) setError('');
                  }}
                  autoComplete="new-password"
                  className="pl-10 py-5"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="flex gap-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Suspense fallback={null}>
              <Message />
            </Suspense>

            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      <div className="hidden sm:flex justify-center items-center ml-2">
        <PasswordRequirements requirements={passwordRequirements} />
      </div>
    </div>
  );
};

export default PasswordUpdateForm;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <div className="flex justify-center mt-2">
      <Button type="submit" disabled={pending} className="w-[200px]">
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          'Update Password'
        )}
      </Button>
    </div>
  );
}

interface PasswordRequirementsProps {
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
  };
}

function PasswordRequirements({ requirements }: PasswordRequirementsProps) {
  return (
    <div className="w-[240px] bg-card border rounded-2xl p-4 ml-2">
      <p className="text-sm font-semibold mb-2">Password Requirements:</p>
      <ul className="space-y-1 m-0">
        <li className="flex items-center gap-2 text-sm">
          {requirements.length ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
          <span className={requirements.length ? 'text-foreground' : 'text-muted-foreground'}>
            At least 6 characters
          </span>
        </li>
        <li className="flex items-center gap-2 text-sm">
          {requirements.uppercase ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
          <span className={requirements.uppercase ? 'text-foreground' : 'text-muted-foreground'}>
            Uppercase letter
          </span>
        </li>
        <li className="flex items-center gap-2 text-sm">
          {requirements.lowercase ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
          <span className={requirements.lowercase ? 'text-foreground' : 'text-muted-foreground'}>
            Lowercase letter
          </span>
        </li>
        <li className="flex items-center gap-2 text-sm">
          {requirements.number ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
          <span className={requirements.number ? 'text-foreground' : 'text-muted-foreground'}>
            Number
          </span>
        </li>
      </ul>
    </div>
  );
}
