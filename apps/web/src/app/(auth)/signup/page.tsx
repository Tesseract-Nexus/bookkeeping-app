'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, User, Building2, ArrowRight, Check } from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { LabeledCheckbox } from '@/components/ui/checkbox';
import { LabeledSeparator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const features = [
  'Unlimited invoices',
  'GST & E-Invoice compliant',
  'Multi-user access',
  'Bank reconciliation',
  'Tax reports & TDS',
  '24/7 support',
];

export default function SignupPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    agreeTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    setIsLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center lg:text-left animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground mt-2">
          Start managing your business finances today
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 animate-fade-in-up animation-delay-100">
        <div className={cn(
          'h-2 flex-1 rounded-full transition-colors',
          step >= 1 ? 'bg-primary' : 'bg-muted'
        )} />
        <div className={cn(
          'h-2 flex-1 rounded-full transition-colors',
          step >= 2 ? 'bg-primary' : 'bg-muted'
        )} />
      </div>

      {/* Features list */}
      <div className="grid grid-cols-2 gap-2 animate-fade-in-up animation-delay-200">
        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Check className="h-4 w-4 text-success" />
            {feature}
          </div>
        ))}
      </div>

      {/* Social signup buttons */}
      <div className="grid grid-cols-2 gap-4 animate-fade-in-up animation-delay-300">
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

      {/* Signup form */}
      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up animation-delay-400">
        {step === 1 ? (
          <>
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
            />

            <PasswordInput
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              hint="Must be at least 8 characters"
              required
            />
          </>
        ) : (
          <>
            <Input
              label="Business Name"
              placeholder="Your Company Pvt Ltd"
              value={formData.businessName}
              onChange={(e) => updateFormData('businessName', e.target.value)}
              leftIcon={<Building2 className="h-4 w-4" />}
              required
            />

            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <h4 className="font-medium text-sm">Your free trial includes:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  14 days free access to all features
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  No credit card required
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  Cancel anytime
                </li>
              </ul>
            </div>

            <LabeledCheckbox
              label="I agree to the Terms of Service and Privacy Policy"
              checked={formData.agreeTerms}
              onCheckedChange={(checked) =>
                updateFormData('agreeTerms', checked as boolean)
              }
            />
          </>
        )}

        <div className="flex gap-3">
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
          )}
          <MotionButton
            type="submit"
            className={cn('h-12', step === 1 ? 'w-full' : 'flex-1')}
            isLoading={isLoading}
            disabled={step === 2 && !formData.agreeTerms}
          >
            {step === 1 ? 'Continue' : 'Create Account'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </MotionButton>
        </div>
      </form>

      {/* Sign in link */}
      <p className="text-center text-sm text-muted-foreground animate-fade-in animation-delay-500">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
