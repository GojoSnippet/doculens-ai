'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFormStatus } from 'react-dom';
import { resetPasswordForEmail } from './action';
import { usePathname } from 'next/navigation';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const currentPathname = usePathname();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (formData: FormData) => {
    formData.append('currentPathname', currentPathname);
    const email = formData.get('email') as string;
    if (email.trim() === '') {
      setError('Email address is required');
      return;
    }

    const result = await resetPasswordForEmail(formData);

    if (result.success) {
      setSuccess(true);
      setError('');
    } else {
      setError(result.message);
      setSuccess(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="link"
        onClick={handleClickOpen}
        className="p-0 h-auto"
      >
        Forgot your password?
      </Button>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve sent you a password reset link. Click the link in the email to reset your password.
                  </p>
                </div>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <form action={handleSubmit} noValidate className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your account&apos;s email address, and we&apos;ll send you a
                link to reset your password.
              </p>

              <Input
                required
                id="email"
                name="email"
                placeholder="Email address"
                type="email"
                autoComplete="email"
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <SubmitButton />

              <div className="flex justify-end mt-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
    </Button>
  );
}
