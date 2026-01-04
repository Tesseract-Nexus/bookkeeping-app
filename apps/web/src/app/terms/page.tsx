import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">BookKeep</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using BookKeep&apos;s services, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              BookKeep provides cloud-based bookkeeping, invoicing, and GST compliance software for businesses
              in India. Our services include but are not limited to: invoice generation, expense tracking,
              GST calculations, financial reporting, and bank reconciliation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for
              all activities that occur under your account. You must immediately notify us of any unauthorized
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of BookKeep is also governed by our Privacy Policy. We are committed to protecting
              your financial data and personal information in accordance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. GST Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              While BookKeep provides tools to assist with GST compliance, you are ultimately responsible
              for the accuracy of your GST filings. We recommend consulting with a qualified tax professional
              for complex tax matters.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              BookKeep shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@bookkeep.in" className="text-primary hover:underline">
                legal@bookkeep.in
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
