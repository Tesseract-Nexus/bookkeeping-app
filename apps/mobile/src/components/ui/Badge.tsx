import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  outline?: boolean;
  rounded?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  outline = false,
  rounded = false,
  className = '',
}: BadgeProps) {
  const variantStyles = {
    default: outline
      ? 'border-gray-300 bg-transparent'
      : 'bg-gray-100',
    primary: outline
      ? 'border-primary-500 bg-transparent'
      : 'bg-primary-50',
    success: outline
      ? 'border-success-500 bg-transparent'
      : 'bg-success-50',
    warning: outline
      ? 'border-warning-500 bg-transparent'
      : 'bg-warning-50',
    error: outline
      ? 'border-error-500 bg-transparent'
      : 'bg-error-50',
    info: outline
      ? 'border-blue-500 bg-transparent'
      : 'bg-blue-50',
  };

  const textColors = {
    default: 'text-gray-700',
    primary: 'text-primary-700',
    success: 'text-success-700',
    warning: 'text-warning-700',
    error: 'text-error-700',
    info: 'text-blue-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1',
    lg: 'px-3 py-1.5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <View
      className={`${variantStyles[variant]} ${sizeStyles[size]} ${
        rounded ? 'rounded-full' : 'rounded-md'
      } ${outline ? 'border' : ''} ${className}`}
    >
      <Text className={`${textColors[variant]} ${textSizes[size]} font-medium`}>
        {children}
      </Text>
    </View>
  );
}

interface StatusBadgeProps {
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'active' | 'inactive';
  size?: BadgeSize;
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig: Record<
    string,
    { label: string; variant: BadgeVariant }
  > = {
    draft: { label: 'Draft', variant: 'default' },
    sent: { label: 'Sent', variant: 'info' },
    paid: { label: 'Paid', variant: 'success' },
    partial: { label: 'Partial', variant: 'warning' },
    overdue: { label: 'Overdue', variant: 'error' },
    cancelled: { label: 'Cancelled', variant: 'default' },
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'default' },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant={config.variant} size={size} rounded>
      {config.label}
    </Badge>
  );
}

interface TransactionTypeBadgeProps {
  type: 'sale' | 'purchase' | 'expense' | 'payment' | 'receipt';
  size?: BadgeSize;
}

export function TransactionTypeBadge({ type, size = 'md' }: TransactionTypeBadgeProps) {
  const typeConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    sale: { label: 'Sale', variant: 'success' },
    purchase: { label: 'Purchase', variant: 'error' },
    expense: { label: 'Expense', variant: 'warning' },
    payment: { label: 'Payment Out', variant: 'error' },
    receipt: { label: 'Payment In', variant: 'success' },
  };

  const config = typeConfig[type] || typeConfig.sale;

  return (
    <Badge variant={config.variant} size={size} rounded>
      {config.label}
    </Badge>
  );
}
