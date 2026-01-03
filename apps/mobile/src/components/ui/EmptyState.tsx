import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon = 'folder-open-outline',
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <View className="items-center py-8 px-4">
        <Ionicons name={icon} size={40} color="#D1D5DB" />
        <Text className="text-gray-400 text-base mt-2 text-center">{title}</Text>
        {description && (
          <Text className="text-gray-400 text-sm mt-1 text-center">
            {description}
          </Text>
        )}
        {actionLabel && onAction && (
          <Button
            variant="ghost"
            size="sm"
            onPress={onAction}
            className="mt-3"
          >
            {actionLabel}
          </Button>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-6">
        <Ionicons name={icon} size={48} color="#9CA3AF" />
      </View>
      <Text className="text-gray-700 text-xl font-semibold text-center">
        {title}
      </Text>
      {description && (
        <Text className="text-gray-400 text-base mt-2 text-center max-w-xs">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          onPress={onAction}
          icon="add"
          className="mt-6"
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

interface NoResultsProps {
  query?: string;
  onClear?: () => void;
}

export function NoResults({ query, onClear }: NoResultsProps) {
  return (
    <EmptyState
      icon="search-outline"
      title="No results found"
      description={query ? `No results for "${query}"` : 'Try adjusting your search or filters'}
      actionLabel={query ? 'Clear search' : undefined}
      onAction={onClear}
      variant="compact"
    />
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <View className="w-20 h-20 rounded-full bg-error-50 items-center justify-center mb-6">
        <Ionicons name="warning-outline" size={40} color="#EF4444" />
      </View>
      <Text className="text-gray-700 text-xl font-semibold text-center">
        {title}
      </Text>
      <Text className="text-gray-400 text-base mt-2 text-center max-w-xs">
        {message}
      </Text>
      {onRetry && (
        <Button
          variant="primary"
          onPress={onRetry}
          icon="refresh"
          className="mt-6"
        >
          Try Again
        </Button>
      )}
    </View>
  );
}

interface OfflineStateProps {
  onRetry?: () => void;
}

export function OfflineState({ onRetry }: OfflineStateProps) {
  return (
    <View className="bg-warning-50 px-4 py-3 flex-row items-center">
      <Ionicons name="cloud-offline-outline" size={20} color="#D97706" />
      <Text className="text-warning-700 ml-2 flex-1">
        You're offline. Some features may be unavailable.
      </Text>
      {onRetry && (
        <Button variant="ghost" size="sm" onPress={onRetry}>
          Retry
        </Button>
      )}
    </View>
  );
}
