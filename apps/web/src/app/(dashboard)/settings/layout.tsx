'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  Building2,
  Users,
  Bell,
  Shield,
  Key,
  CreditCard,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/layout/header';

interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
  requiredRoles?: string[];
}

const settingsNavItems: SettingsNavItem[] = [
  {
    title: 'Profile',
    href: '/settings',
    icon: User,
    description: 'Manage your personal information',
  },
  {
    title: 'Business',
    href: '/settings/business',
    icon: Building2,
    description: 'Company details and GST settings',
  },
  {
    title: 'Team',
    href: '/settings/team',
    icon: Users,
    description: 'Manage team members and roles',
    requiredRoles: ['owner', 'admin'],
  },
  {
    title: 'Enterprise SSO',
    href: '/settings/enterprise-sso',
    icon: Key,
    description: 'Configure single sign-on integration',
    requiredRoles: ['owner'],
  },
  {
    title: 'Security',
    href: '/settings/security',
    icon: Shield,
    description: 'Password and authentication settings',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Email and alert preferences',
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Subscription and payment details',
    requiredRoles: ['owner', 'admin'],
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Theme and display preferences',
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasAnyRole, isLoading } = useAuth();

  // Filter nav items based on user roles
  const visibleNavItems = settingsNavItems.filter((item) => {
    if (!item.requiredRoles) return true;
    return hasAnyRole(item.requiredRoles);
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account and business preferences"
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <nav className="lg:w-64 shrink-0">
          <div className="space-y-1">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-muted/50 rounded-lg animate-pulse"
                />
              ))
            ) : (
              visibleNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.title}</p>
                      {!isActive && (
                        <p className="text-xs opacity-70 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </nav>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-xl border p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
