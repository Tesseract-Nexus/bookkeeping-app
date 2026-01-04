import * as React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Branding */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-primary via-primary/90 to-purple-600 p-12 flex-col justify-between overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        {/* Floating shapes */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" />

        {/* Logo */}
        <div className="relative z-10 animate-fade-in-down">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">BookKeep</span>
          </Link>
        </div>

        {/* Testimonial/Feature */}
        <div className="relative z-10 space-y-6 animate-fade-in-up animation-delay-200">
          <blockquote className="text-xl text-white/90 leading-relaxed">
            &ldquo;BookKeep has transformed how we manage our finances. GST compliance
            has never been easier, and the invoicing system saves us hours every week.&rdquo;
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
              RK
            </div>
            <div>
              <p className="font-semibold text-white">Rajesh Kumar</p>
              <p className="text-sm text-white/70">CEO, TechStart India</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-8 animate-fade-in-up animation-delay-400">
          <div>
            <p className="text-3xl font-bold text-white">10K+</p>
            <p className="text-sm text-white/70">Active Users</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">50L+</p>
            <p className="text-sm text-white/70">Invoices Created</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">99.9%</p>
            <p className="text-sm text-white/70">Uptime</p>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in-right animation-delay-300">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <span className="text-2xl font-bold">BookKeep</span>
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
