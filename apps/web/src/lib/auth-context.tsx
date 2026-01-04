'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.user) {
          setUser(data.data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const hasRole = React.useCallback((role: string) => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);

  const hasAnyRole = React.useCallback((roles: string[]) => {
    return roles.some(role => user?.roles?.includes(role));
  }, [user]);

  const isOwner = React.useMemo(() => hasRole('owner'), [hasRole]);
  const isAdmin = React.useMemo(() => hasRole('admin') || isOwner, [hasRole, isOwner]);

  const login = React.useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Login failed');
    }

    if (data.data?.access_token) {
      document.cookie = `access_token=${data.data.access_token}; path=/; max-age=${data.data.expires_in || 900}; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`;
    }

    if (data.data?.user) {
      setUser(data.data.user);
    }

    return data;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    }

    // Clear cookies
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    setUser(null);
    router.push('/login');
    router.refresh();
  }, [router]);

  const value = React.useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    isOwner,
    isAdmin,
    login,
    logout,
    refreshUser,
  }), [user, isLoading, hasRole, hasAnyRole, isOwner, isAdmin, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for role-based access control
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: string[],
  fallback?: React.ReactNode
) {
  return function RoleGuardedComponent(props: P) {
    const { hasAnyRole, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      );
    }

    if (!hasAnyRole(allowedRoles)) {
      return fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
