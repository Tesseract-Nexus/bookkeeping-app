import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');

  const { requestOTP, loginWithEmail, isLoading, error, clearError } = useAuthStore();

  const handlePhoneLogin = async () => {
    if (!phone || phone.length < 10) {
      return;
    }
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    const success = await requestOTP(formattedPhone);
    if (success) {
      router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      return;
    }
    const success = await loginWithEmail(email, password);
    if (success) {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo and Title */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4">
              <Text className="text-white text-3xl font-bold">B</Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900">BookKeep</Text>
            <Text className="text-gray-500 mt-2">Simple bookkeeping for your business</Text>
          </View>

          {/* Login Method Toggle */}
          <View className="flex-row bg-gray-100 rounded-lg p-1 mb-6">
            <TouchableOpacity
              onPress={() => {
                setLoginMethod('phone');
                clearError();
              }}
              className={`flex-1 py-2 rounded-md ${
                loginMethod === 'phone' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  loginMethod === 'phone' ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                Phone
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setLoginMethod('email');
                clearError();
              }}
              className={`flex-1 py-2 rounded-md ${
                loginMethod === 'email' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  loginMethod === 'email' ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-error-50 rounded-lg p-3 mb-4">
              <Text className="text-error-600 text-center">{error}</Text>
            </View>
          )}

          {/* Phone Login */}
          {loginMethod === 'phone' && (
            <View>
              <Text className="text-gray-700 font-medium mb-2">Mobile Number</Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg overflow-hidden">
                <View className="bg-gray-50 px-3 py-3 border-r border-gray-300">
                  <Text className="text-gray-600">+91</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="flex-1 px-4 py-3 text-gray-900"
                />
              </View>

              <TouchableOpacity
                onPress={handlePhoneLogin}
                disabled={isLoading || phone.length < 10}
                className={`mt-6 py-4 rounded-lg items-center ${
                  isLoading || phone.length < 10 ? 'bg-primary-300' : 'bg-primary-600'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-lg">Get OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Email Login */}
          {loginMethod === 'email' && (
            <View>
              <Text className="text-gray-700 font-medium mb-2">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 mb-4"
              />

              <Text className="text-gray-700 font-medium mb-2">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              />

              <TouchableOpacity
                onPress={handleEmailLogin}
                disabled={isLoading || !email || !password}
                className={`mt-6 py-4 rounded-lg items-center ${
                  isLoading || !email || !password ? 'bg-primary-300' : 'bg-primary-600'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-lg">Sign In</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Register Link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-primary-600 font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
