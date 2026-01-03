import { View, Text, TouchableOpacity, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';

interface CardProps extends ViewProps {
  children: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  className = '',
  ...props
}: CardProps) {
  const baseClasses = 'rounded-xl';

  const variantClasses = {
    default: 'bg-white',
    outlined: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const combinedClassName = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={combinedClassName}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={combinedClassName} {...props}>
      {children}
    </View>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = '#4F46E5',
  iconBgColor = 'bg-primary-50',
  trend,
  onPress,
}: StatCardProps) {
  return (
    <Card onPress={onPress} variant="elevated" className="shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-gray-500 text-sm mb-1">{title}</Text>
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>
          {subtitle && (
            <Text className="text-gray-400 text-xs mt-1">{subtitle}</Text>
          )}
          {trend && (
            <View className="flex-row items-center mt-2">
              <Ionicons
                name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={trend.isPositive ? '#10B981' : '#EF4444'}
              />
              <Text
                className={`text-sm ml-1 ${
                  trend.isPositive ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {Math.abs(trend.value).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
        {icon && (
          <View className={`w-12 h-12 rounded-full items-center justify-center ${iconBgColor}`}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
        )}
      </View>
    </Card>
  );
}

interface ListCardProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftIconColor?: string;
  leftIconBgColor?: string;
  rightText?: string;
  rightSubtext?: string;
  rightTextColor?: string;
  showChevron?: boolean;
  onPress?: () => void;
}

export function ListCard({
  title,
  subtitle,
  leftIcon,
  leftIconColor = '#6B7280',
  leftIconBgColor = 'bg-gray-100',
  rightText,
  rightSubtext,
  rightTextColor = 'text-gray-900',
  showChevron = true,
  onPress,
}: ListCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white flex-row items-center py-4 px-4 border-b border-gray-100"
    >
      {leftIcon && (
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${leftIconBgColor}`}>
          <Ionicons name={leftIcon} size={20} color={leftIconColor} />
        </View>
      )}
      <View className="flex-1">
        <Text className="text-gray-900 font-medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View className="items-end ml-3">
        {rightText && (
          <Text className={`font-semibold ${rightTextColor}`}>{rightText}</Text>
        )}
        {rightSubtext && (
          <Text className="text-gray-400 text-xs">{rightSubtext}</Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" className="ml-2" />
      )}
    </TouchableOpacity>
  );
}
