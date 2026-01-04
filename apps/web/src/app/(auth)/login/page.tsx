'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ArrowRight } from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { LabeledCheckbox } from '@/components/ui/checkbox';
import { LabeledSeparator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Store access token in cookie (for client-side access)
      if (data.data?.access_token) {
        document.cookie = `access_token=${data.data.access_token}; path=/; max-age=${data.data.expires_in || 900}; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`;
      }

      // Redirect to the original page or dashboard
      const redirectTo = searchParams.get('redirect') || '/dashboard';
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center lg:text-left animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-2">
          Sign in to your account to continue
        </p>
      </div>

      {/* Social login buttons */}
      <div className="grid grid-cols-2 gap-4 animate-fade-in-up animation-delay-100">
        <Button variant="outline" className="h-12">
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </Button>
        <Button variant="outline" className="h-12">
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Meta
        </Button>
      </div>

      <LabeledSeparator label="or continue with email" />

      {/* Error message */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
          {error}
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up animation-delay-200">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between">
          <LabeledCheckbox label="Remember me" />
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <MotionButton
          type="submit"
          className="w-full h-12"
          isLoading={isLoading}
        >
          Sign In
          <ArrowRight className="ml-2 h-4 w-4" />
        </MotionButton>
      </form>

      {/* Sign up link */}
      <p className="text-center text-sm text-muted-foreground animate-fade-in animation-delay-300">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Sign up for free
        </Link>
      </p>

      {/* Terms */}
      <p className="text-center text-xs text-muted-foreground animate-fade-in animation-delay-400">
        By signing in, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
