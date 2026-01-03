import { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  prefix?: string;
  suffix?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      prefix,
      suffix,
      containerClassName = '',
      className = '',
      secureTextEntry,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const borderColor = error
      ? 'border-error-500'
      : isFocused
      ? 'border-primary-500'
      : 'border-gray-300';

    const isPassword = secureTextEntry !== undefined;

    return (
      <View className={containerClassName}>
        {label && (
          <Text className="text-gray-700 font-medium mb-2">{label}</Text>
        )}
        <View
          className={`flex-row items-center border rounded-xl bg-white ${borderColor} ${
            isFocused ? 'border-2' : ''
          }`}
        >
          {prefix && (
            <View className="bg-gray-50 px-3 py-3 border-r border-gray-300 rounded-l-xl">
              <Text className="text-gray-600">{prefix}</Text>
            </View>
          )}
          {leftIcon && (
            <View className="pl-3">
              <Ionicons
                name={leftIcon}
                size={20}
                color={isFocused ? '#4F46E5' : '#9CA3AF'}
              />
            </View>
          )}
          <TextInput
            ref={ref}
            className={`flex-1 px-4 py-3 text-gray-900 ${className}`}
            placeholderTextColor="#9CA3AF"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isPassword && !showPassword}
            {...props}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              className="pr-3"
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          )}
          {rightIcon && !isPassword && (
            <TouchableOpacity
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
              className="pr-3"
            >
              <Ionicons
                name={rightIcon}
                size={20}
                color={isFocused ? '#4F46E5' : '#9CA3AF'}
              />
            </TouchableOpacity>
          )}
          {suffix && (
            <View className="bg-gray-50 px-3 py-3 border-l border-gray-300 rounded-r-xl">
              <Text className="text-gray-600">{suffix}</Text>
            </View>
          )}
        </View>
        {error && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text className="text-error-500 text-sm ml-1">{error}</Text>
          </View>
        )}
        {hint && !error && (
          <Text className="text-gray-400 text-sm mt-1">{hint}</Text>
        )}
      </View>
    );
  }
);

interface SearchInputProps extends TextInputProps {
  onClear?: () => void;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search...',
  containerClassName = '',
  ...props
}: SearchInputProps) {
  return (
    <View
      className={`flex-row items-center bg-gray-100 rounded-xl px-3 py-2 ${containerClassName}`}
    >
      <Ionicons name="search" size={20} color="#9CA3AF" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        className="flex-1 ml-2 text-gray-900"
        returnKeyType="search"
        {...props}
      />
      {value && value.length > 0 && (
        <TouchableOpacity onPress={onClear}>
          <Ionicons name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
  currency?: string;
  containerClassName?: string;
}

export function AmountInput({
  value,
  onChangeText,
  label,
  error,
  currency = '₹',
  containerClassName = '',
}: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    onChangeText(cleaned);
  };

  const borderColor = error
    ? 'border-error-500'
    : isFocused
    ? 'border-primary-500'
    : 'border-gray-200';

  return (
    <View className={containerClassName}>
      {label && (
        <Text className="text-gray-700 font-medium mb-2">{label}</Text>
      )}
      <View
        className={`flex-row items-center border rounded-xl bg-white ${borderColor} ${
          isFocused ? 'border-2' : ''
        }`}
      >
        <View className="pl-4">
          <Text className="text-gray-500 text-2xl">{currency}</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder="0"
          keyboardType="decimal-pad"
          className="flex-1 px-3 py-4 text-3xl font-bold text-gray-900"
          placeholderTextColor="#D1D5DB"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      {error && (
        <Text className="text-error-500 text-sm mt-1">{error}</Text>
      )}
    </View>
  );
}

interface OTPInputProps {
  length?: number;
  value: string[];
  onChange: (otp: string[], index: number) => void;
  onComplete?: (otp: string) => void;
  error?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
}: OTPInputProps) {
  const inputRefs: (TextInput | null)[] = [];

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue, index);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newValue.every((d) => d) && newValue.join('').length === length) {
      onComplete?.(newValue.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs[index - 1]?.focus();
    }
  };

  return (
    <View>
      <View className="flex-row justify-between">
        {Array.from({ length }).map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs[index] = ref)}
            value={value[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            className={`w-12 h-14 border-2 rounded-xl text-center text-2xl font-bold ${
              value[index]
                ? 'border-primary-600 bg-primary-50'
                : error
                ? 'border-error-500'
                : 'border-gray-300'
            }`}
            selectionColor="#4F46E5"
          />
        ))}
      </View>
      {error && (
        <Text className="text-error-500 text-sm text-center mt-3">{error}</Text>
      )}
    </View>
  );
}
