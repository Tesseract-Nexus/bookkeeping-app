import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'flex-row items-center justify-center rounded-xl';

  const variantClasses = {
    primary: disabled ? 'bg-primary-300' : 'bg-primary-600',
    secondary: disabled ? 'bg-gray-200' : 'bg-gray-100',
    outline: 'bg-transparent border-2 border-primary-600',
    ghost: 'bg-transparent',
    danger: disabled ? 'bg-error-300' : 'bg-error-600',
  };

  const textColors = {
    primary: 'text-white',
    secondary: 'text-gray-700',
    outline: 'text-primary-600',
    ghost: 'text-primary-600',
    danger: 'text-white',
  };

  const sizeClasses = {
    sm: 'py-2 px-4',
    md: 'py-3 px-6',
    lg: 'py-4 px-8',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const iconColors = {
    primary: '#FFFFFF',
    secondary: '#374151',
    outline: '#4F46E5',
    ghost: '#4F46E5',
    danger: '#FFFFFF',
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={iconColors[variant]} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSizes[size]}
              color={iconColors[variant]}
              style={{ marginRight: 8 }}
            />
          )}
          <Text className={`font-semibold ${textColors[variant]} ${textSizes[size]}`}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={iconSizes[size]}
              color={iconColors[variant]}
              style={{ marginLeft: 8 }}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  badge?: number;
  className?: string;
}

export function IconButton({
  icon,
  onPress,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  badge,
  className = '',
}: IconButtonProps) {
  const sizeMap = {
    sm: { button: 'w-8 h-8', icon: 18 },
    md: { button: 'w-10 h-10', icon: 22 },
    lg: { button: 'w-12 h-12', icon: 26 },
  };

  const variantClasses = {
    primary: 'bg-primary-600',
    secondary: 'bg-gray-100',
    outline: 'bg-transparent border border-gray-300',
    ghost: 'bg-transparent',
  };

  const iconColors = {
    primary: '#FFFFFF',
    secondary: '#374151',
    outline: '#374151',
    ghost: '#374151',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      className={`rounded-full items-center justify-center ${sizeMap[size].button} ${variantClasses[variant]} ${className}`}
    >
      <Ionicons name={icon} size={sizeMap[size].icon} color={iconColors[variant]} />
      {badge !== undefined && badge > 0 && (
        <View className="absolute -top-1 -right-1 bg-error-600 rounded-full min-w-5 h-5 items-center justify-center px-1">
          <Text className="text-white text-xs font-bold">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface FABProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  label?: string;
  variant?: 'primary' | 'secondary';
  position?: 'bottom-right' | 'bottom-center';
}

export function FAB({
  icon,
  onPress,
  label,
  variant = 'primary',
  position = 'bottom-right',
}: FABProps) {
  const positionClasses = {
    'bottom-right': 'absolute bottom-6 right-6',
    'bottom-center': 'absolute bottom-6 self-center',
  };

  const variantClasses = {
    primary: 'bg-primary-600',
    secondary: 'bg-gray-800',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`${positionClasses[position]} ${variantClasses[variant]} rounded-full shadow-lg ${
        label ? 'flex-row items-center px-5 py-4' : 'w-14 h-14 items-center justify-center'
      }`}
    >
      <Ionicons name={icon} size={24} color="#FFFFFF" />
      {label && <Text className="text-white font-semibold ml-2">{label}</Text>}
    </TouchableOpacity>
  );
}
