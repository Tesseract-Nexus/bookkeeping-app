import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';

export default function OTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const { login, requestOTP, isLoading, error, clearError } = useAuthStore();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newOtp.every((digit) => digit) && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6 || !phone) return;

    const success = await login(phone, code);
    if (success) {
      router.replace('/(tabs)/home');
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !phone) return;
    clearError();
    await requestOTP(phone);
    setCountdown(30);
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-12 left-4"
        >
          <Text className="text-primary-600 text-lg">← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-gray-900">Verify OTP</Text>
          <Text className="text-gray-500 mt-2 text-center">
            Enter the 6-digit code sent to{'\n'}
            <Text className="font-medium text-gray-700">{phone}</Text>
          </Text>
        </View>

        {/* Error Message */}
        {error && (
          <View className="bg-error-50 rounded-lg p-3 mb-6">
            <Text className="text-error-600 text-center">{error}</Text>
          </View>
        )}

        {/* OTP Input */}
        <View className="flex-row justify-between mb-8">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              value={digit}
              onChangeText={(value) => handleOtpChange(value.replace(/[^0-9]/g, '').slice(-1), index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              className={`w-12 h-14 border-2 rounded-lg text-center text-2xl font-bold ${
                digit ? 'border-primary-600' : 'border-gray-300'
              }`}
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={() => handleVerify()}
          disabled={isLoading || otp.some((d) => !d)}
          className={`py-4 rounded-lg items-center ${
            isLoading || otp.some((d) => !d) ? 'bg-primary-300' : 'bg-primary-600'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Verify</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
            <Text className={countdown > 0 ? 'text-gray-400' : 'text-primary-600 font-semibold'}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
