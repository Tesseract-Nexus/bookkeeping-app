'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  Mail,
  Phone,
  FileQuestion,
  Video,
  ExternalLink,
  Search,
  ChevronRight,
  Lightbulb,
  Shield,
  CreditCard,
  FileText,
  Calculator,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  articles: string[];
  color: string;
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of using BookKeep',
    icon: Lightbulb,
    articles: ['Creating your first invoice', 'Setting up your business profile', 'Adding customers and vendors'],
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  },
  {
    id: 'invoicing',
    title: 'Invoicing',
    description: 'Creating and managing invoices',
    icon: FileText,
    articles: ['Invoice templates', 'Recurring invoices', 'Payment reminders'],
    color: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  },
  {
    id: 'tax-compliance',
    title: 'Tax & GST',
    description: 'GST returns and tax compliance',
    icon: Calculator,
    articles: ['GSTR-1 filing guide', 'GSTR-3B summary', 'Input Tax Credit'],
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Financial reports and analytics',
    icon: BarChart3,
    articles: ['Profit & Loss report', 'Balance Sheet', 'Cash Flow statement'],
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Managing your subscription',
    icon: CreditCard,
    articles: ['Subscription plans', 'Payment methods', 'Billing history'],
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Account security and privacy',
    icon: Shield,
    articles: ['Two-factor authentication', 'Password management', 'Data privacy'],
    color: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  },
];

const faqs = [
  {
    question: 'How do I create my first invoice?',
    answer: 'Navigate to Invoices from the sidebar, click "New Invoice", fill in the customer and item details, then click "Create Invoice".',
  },
  {
    question: 'How do I file my GST returns?',
    answer: 'Go to Tax & GST section, select the return type (GSTR-1 or GSTR-3B), review the auto-populated data, and submit through the GST portal.',
  },
  {
    question: 'Can I set up recurring invoices?',
    answer: 'Yes! When creating an invoice, enable the "Recurring" option and set your preferred frequency (weekly, monthly, quarterly, etc.).',
  },
  {
    question: 'How do I export my financial reports?',
    answer: 'Open any report, select your date range, and click the "Export" button to download as PDF or Excel.',
  },
];

export default function HelpPage() {
  const { isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');

  if (authLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-12 w-full bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Animation */}
      <div className="text-center space-y-4 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">How can we help you?</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Search our knowledge base or browse categories below to find answers to your questions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 rounded-xl border bg-card text-lg shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Help Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {helpCategories.map((category, index) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className="group bg-card border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-up hover:-translate-y-1"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${category.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {category.articles.map((article) => (
                  <li key={article} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-3 w-3" />
                    {article}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* FAQs Section */}
      <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileQuestion className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group bg-card border rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="font-medium">{faq.question}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-4 pb-4 text-muted-foreground">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Support Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '500ms' }}>
        <div className="bg-card border rounded-xl p-6 text-center hover:shadow-md hover:border-primary/30 transition-all group">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 mb-4 group-hover:scale-110 transition-transform">
            <MessageCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold">Live Chat</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Chat with our support team</p>
          <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            Start Chat
          </Button>
        </div>

        <div className="bg-card border rounded-xl p-6 text-center hover:shadow-md hover:border-primary/30 transition-all group">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 mb-4 group-hover:scale-110 transition-transform">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold">Email Support</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">support@bookkeep.in</p>
          <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            Send Email
          </Button>
        </div>

        <div className="bg-card border rounded-xl p-6 text-center hover:shadow-md hover:border-primary/30 transition-all group">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 mb-4 group-hover:scale-110 transition-transform">
            <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold">Video Tutorials</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Watch step-by-step guides</p>
          <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            Watch Now
          </Button>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border rounded-xl p-6 flex items-center justify-between animate-slide-up" style={{ animationDelay: '600ms' }}>
        <div className="flex items-center gap-4">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-semibold">Documentation</h3>
            <p className="text-sm text-muted-foreground">Comprehensive guides and API documentation</p>
          </div>
        </div>
        <Button className="gap-2">
          View Docs
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
