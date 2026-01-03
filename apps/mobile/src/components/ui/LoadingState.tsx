import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingStateProps {
  message?: string;
  variant?: 'fullscreen' | 'inline' | 'overlay';
}

export function LoadingState({
  message = 'Loading...',
  variant = 'inline',
}: LoadingStateProps) {
  if (variant === 'fullscreen') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-gray-500 mt-4">{message}</Text>
      </View>
    );
  }

  if (variant === 'overlay') {
    return (
      <View className="absolute inset-0 bg-black/50 items-center justify-center z-50">
        <View className="bg-white rounded-2xl p-6 items-center shadow-lg">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-gray-700 mt-4 font-medium">{message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="py-8 items-center">
      <ActivityIndicator size="small" color="#4F46E5" />
      {message && <Text className="text-gray-400 text-sm mt-2">{message}</Text>}
    </View>
  );
}

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
}: SkeletonProps) {
  return (
    <View
      className={`bg-gray-200 animate-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm">
      <View className="flex-row items-center">
        <Skeleton width={48} height={48} borderRadius={24} />
        <View className="flex-1 ml-3">
          <Skeleton width="60%" height={16} className="mb-2" />
          <Skeleton width="40%" height={12} />
        </View>
        <Skeleton width={80} height={20} />
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          className="bg-white flex-row items-center py-4 px-4 border-b border-gray-100"
        >
          <Skeleton width={40} height={40} borderRadius={20} />
          <View className="flex-1 ml-3">
            <Skeleton width="70%" height={16} className="mb-2" />
            <Skeleton width="40%" height={12} />
          </View>
          <Skeleton width={60} height={18} />
        </View>
      ))}
    </View>
  );
}

export function StatCardSkeleton() {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm">
      <Skeleton width="40%" height={14} className="mb-2" />
      <Skeleton width="60%" height={28} className="mb-2" />
      <Skeleton width="50%" height={12} />
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View className="px-4">
      <StatCardSkeleton />
      <View className="flex-row gap-4 mt-4">
        <View className="flex-1">
          <StatCardSkeleton />
        </View>
        <View className="flex-1">
          <StatCardSkeleton />
        </View>
      </View>
      <View className="mt-6">
        <Skeleton width={120} height={18} className="mb-4" />
        <ListSkeleton count={3} />
      </View>
    </View>
  );
}
