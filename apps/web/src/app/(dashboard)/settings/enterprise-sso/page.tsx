'use client';

import * as React from 'react';
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Info,
  Trash2,
} from 'lucide-react';
import { Button, MotionButton } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type SSOProvider = 'entra' | 'okta' | null;

interface SSOConfig {
  provider: SSOProvider;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  domain?: string;
  issuer?: string;
  isEnabled: boolean;
  lastSynced?: Date;
}

export default function EnterpriseSSOPage() {
  const { isOwner, isLoading: authLoading } = useAuth();
  const [selectedProvider, setSelectedProvider] = React.useState<SSOProvider>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<'success' | 'error' | null>(null);

  // Entra ID (Azure AD) form state
  const [entraConfig, setEntraConfig] = React.useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
  });

  // Okta form state
  const [oktaConfig, setOktaConfig] = React.useState({
    domain: '',
    clientId: '',
    clientSecret: '',
    issuer: '',
  });

  // Current SSO configuration (simulated)
  const [currentConfig, setCurrentConfig] = React.useState<SSOConfig>({
    provider: null,
    isEnabled: false,
  });

  // Check if user is owner
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Shield className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          Enterprise SSO configuration is only available to the account owner.
          Please contact your organization administrator to configure SSO settings.
        </p>
      </div>
    );
  }

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate random success/failure for demo
    const success = Math.random() > 0.3;
    setTestResult(success ? 'success' : 'error');
    setIsTesting(false);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);

    // TODO: Implement actual API call to save SSO configuration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setCurrentConfig({
      provider: selectedProvider,
      isEnabled: true,
      lastSynced: new Date(),
      ...(selectedProvider === 'entra' ? entraConfig : oktaConfig),
    });

    setIsSaving(false);
  };

  const handleDisableSSO = async () => {
    if (!confirm('Are you sure you want to disable Enterprise SSO? All users will need to use email/password login.')) {
      return;
    }

    setCurrentConfig({
      provider: null,
      isEnabled: false,
    });
    setSelectedProvider(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/sso/callback`
    : 'https://your-domain.com/api/auth/sso/callback';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Enterprise SSO Configuration
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your organization&apos;s identity provider for seamless single sign-on access
        </p>
      </div>

      {/* Current Status */}
      {currentConfig.isEnabled && (
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                SSO is Active - {currentConfig.provider === 'entra' ? 'Microsoft Entra ID' : 'Okta'}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Last synced: {currentConfig.lastSynced?.toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisableSSO}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Disable SSO
          </Button>
        </div>
      )}

      {/* Provider Selection */}
      {!currentConfig.isEnabled && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Select Identity Provider</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Microsoft Entra ID Card */}
            <button
              type="button"
              onClick={() => setSelectedProvider('entra')}
              className={cn(
                'p-6 rounded-xl border-2 text-left transition-all hover:border-primary/50',
                selectedProvider === 'entra'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-[#0078d4] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor">
                    <path d="M11.5 3L2 8v8l9.5 5 9.5-5V8l-9.5-5zm0 2.18L17.93 8 11.5 10.82 5.07 8 11.5 5.18zM4 9.39l6.5 3.25v5.97L4 15.36V9.39zm15 5.97l-6.5 3.25v-5.97l6.5-3.25v5.97z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Microsoft Entra ID</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formerly Azure Active Directory. Connect with your Microsoft 365 organization.
                  </p>
                  {selectedProvider === 'entra' && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Okta Card */}
            <button
              type="button"
              onClick={() => setSelectedProvider('okta')}
              className={cn(
                'p-6 rounded-xl border-2 text-left transition-all hover:border-primary/50',
                selectedProvider === 'okta'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-[#007dc1] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Okta</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enterprise-grade identity management with Okta Workforce Identity.
                  </p>
                  {selectedProvider === 'okta' && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Configuration Forms */}
      {selectedProvider && !currentConfig.isEnabled && (
        <div className="space-y-6 pt-6 border-t">
          {/* Callback URL Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Callback URL (Required for {selectedProvider === 'entra' ? 'Entra ID' : 'Okta'} Configuration)
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded border text-xs font-mono break-all">
                    {callbackUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(callbackUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Add this URL to your identity provider&apos;s allowed redirect URIs
                </p>
              </div>
            </div>
          </div>

          {/* Entra ID Configuration Form */}
          {selectedProvider === 'entra' && (
            <div className="space-y-4">
              <h3 className="font-medium">Microsoft Entra ID Configuration</h3>

              <Input
                label="Tenant ID"
                value={entraConfig.tenantId}
                onChange={(e) => setEntraConfig({ ...entraConfig, tenantId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                helperText="Found in Azure Portal > Entra ID > Overview"
              />

              <Input
                label="Application (Client) ID"
                value={entraConfig.clientId}
                onChange={(e) => setEntraConfig({ ...entraConfig, clientId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                helperText="The Application ID from your registered app"
              />

              <PasswordInput
                label="Client Secret"
                value={entraConfig.clientSecret}
                onChange={(e) => setEntraConfig({ ...entraConfig, clientSecret: e.target.value })}
                placeholder="Enter your client secret"
                helperText="Create a new secret in Certificates & Secrets"
              />

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Setup Instructions</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Go to Azure Portal and navigate to Entra ID (Azure AD)</li>
                  <li>Register a new application under App registrations</li>
                  <li>Add the callback URL above to Redirect URIs</li>
                  <li>Create a client secret under Certificates & secrets</li>
                  <li>Copy the Tenant ID, Application ID, and Secret here</li>
                </ol>
                <a
                  href="https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                >
                  View Microsoft Documentation
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Okta Configuration Form */}
          {selectedProvider === 'okta' && (
            <div className="space-y-4">
              <h3 className="font-medium">Okta Configuration</h3>

              <Input
                label="Okta Domain"
                value={oktaConfig.domain}
                onChange={(e) => setOktaConfig({ ...oktaConfig, domain: e.target.value })}
                placeholder="your-company.okta.com"
                helperText="Your Okta organization domain (without https://)"
              />

              <Input
                label="Client ID"
                value={oktaConfig.clientId}
                onChange={(e) => setOktaConfig({ ...oktaConfig, clientId: e.target.value })}
                placeholder="0oaxxxxxxxxxxxxxxxx"
                helperText="Found in your Okta application settings"
              />

              <PasswordInput
                label="Client Secret"
                value={oktaConfig.clientSecret}
                onChange={(e) => setOktaConfig({ ...oktaConfig, clientSecret: e.target.value })}
                placeholder="Enter your client secret"
                helperText="The client secret from your Okta application"
              />

              <Input
                label="Issuer URL (Optional)"
                value={oktaConfig.issuer}
                onChange={(e) => setOktaConfig({ ...oktaConfig, issuer: e.target.value })}
                placeholder="https://your-company.okta.com/oauth2/default"
                helperText="Leave blank to use the default authorization server"
              />

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Setup Instructions</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Log in to your Okta Admin Console</li>
                  <li>Navigate to Applications &gt; Create App Integration</li>
                  <li>Select OIDC - OpenID Connect and Web Application</li>
                  <li>Add the callback URL above to Sign-in redirect URIs</li>
                  <li>Copy the Client ID and Secret here</li>
                </ol>
                <a
                  href="https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                >
                  View Okta Documentation
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Test Connection Result */}
          {testResult && (
            <div className={cn(
              'p-4 rounded-lg flex items-center gap-3',
              testResult === 'success'
                ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900'
                : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
            )}>
              {testResult === 'success' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Connection Successful</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Your SSO configuration is valid and ready to use
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Connection Failed</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Please verify your credentials and try again
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setSelectedProvider(null)}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <MotionButton
                onClick={handleSaveConfig}
                isLoading={isSaving}
                disabled={
                  selectedProvider === 'entra'
                    ? !entraConfig.tenantId || !entraConfig.clientId || !entraConfig.clientSecret
                    : !oktaConfig.domain || !oktaConfig.clientId || !oktaConfig.clientSecret
                }
              >
                Enable SSO
              </MotionButton>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="pt-6 border-t">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Need Help?</h3>
        <p className="text-sm text-muted-foreground">
          Enterprise SSO allows your team members to sign in using their existing corporate credentials.
          Once configured, users from your organization will be able to access BookKeep without
          creating separate accounts. For assistance with SSO setup, contact{' '}
          <a href="mailto:enterprise@bookkeep.in" className="text-primary hover:underline">
            enterprise@bookkeep.in
          </a>
        </p>
      </div>
    </div>
  );
}
