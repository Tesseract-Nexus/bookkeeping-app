import { View, Text, Image } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  variant?: 'circle' | 'rounded';
  className?: string;
}

export function Avatar({
  source,
  name,
  size = 'md',
  variant = 'circle',
  className = '',
}: AvatarProps) {
  const sizeStyles = {
    xs: { container: 'w-6 h-6', text: 'text-xs' },
    sm: { container: 'w-8 h-8', text: 'text-sm' },
    md: { container: 'w-10 h-10', text: 'text-base' },
    lg: { container: 'w-14 h-14', text: 'text-lg' },
    xl: { container: 'w-20 h-20', text: 'text-2xl' },
  };

  const variantStyles = {
    circle: 'rounded-full',
    rounded: 'rounded-xl',
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  const getColorFromName = (name?: string) => {
    const colors = [
      'bg-primary-500',
      'bg-success-500',
      'bg-warning-500',
      'bg-error-500',
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    if (!name) return colors[0];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        className={`${sizeStyles[size].container} ${variantStyles[variant]} ${className}`}
      />
    );
  }

  return (
    <View
      className={`${sizeStyles[size].container} ${variantStyles[variant]} ${getColorFromName(name)} items-center justify-center ${className}`}
    >
      <Text className={`text-white font-bold ${sizeStyles[size].text}`}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

interface AvatarGroupProps {
  avatars: { source?: string; name: string }[];
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ avatars, max = 4, size = 'md' }: AvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapStyles = {
    xs: '-ml-2',
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
  };

  return (
    <View className="flex-row">
      {displayed.map((avatar, index) => (
        <View
          key={index}
          className={`${index > 0 ? overlapStyles[size] : ''} border-2 border-white rounded-full`}
        >
          <Avatar
            source={avatar.source}
            name={avatar.name}
            size={size}
          />
        </View>
      ))}
      {remaining > 0 && (
        <View
          className={`${overlapStyles[size]} border-2 border-white rounded-full`}
        >
          <View
            className={`${
              size === 'xs'
                ? 'w-6 h-6'
                : size === 'sm'
                ? 'w-8 h-8'
                : size === 'md'
                ? 'w-10 h-10'
                : size === 'lg'
                ? 'w-14 h-14'
                : 'w-20 h-20'
            } rounded-full bg-gray-300 items-center justify-center`}
          >
            <Text className="text-gray-700 font-bold text-xs">
              +{remaining}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
