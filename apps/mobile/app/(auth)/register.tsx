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
import { api } from '../../src/lib/api';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    phone: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    business_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleRegister = async () => {
    if (!form.phone || !form.first_name || !form.business_name) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formattedPhone = form.phone.startsWith('+91') ? form.phone : `+91${form.phone}`;
      const response = await api.auth.register({
        ...form,
        phone: formattedPhone,
      });

      if (response.success) {
        router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
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
        <View className="flex-1 px-6 py-12">
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-primary-600 text-lg">← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900">Create Account</Text>
            <Text className="text-gray-500 mt-2">
              Start managing your business finances
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-error-50 rounded-lg p-3 mb-4">
              <Text className="text-error-600 text-center">{error}</Text>
            </View>
          )}

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 font-medium mb-2">First Name *</Text>
              <TextInput
                value={form.first_name}
                onChangeText={(v) => updateForm('first_name', v)}
                placeholder="Enter your first name"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">Last Name</Text>
              <TextInput
                value={form.last_name}
                onChangeText={(v) => updateForm('last_name', v)}
                placeholder="Enter your last name"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">Mobile Number *</Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg overflow-hidden">
                <View className="bg-gray-50 px-3 py-3 border-r border-gray-300">
                  <Text className="text-gray-600">+91</Text>
                </View>
                <TextInput
                  value={form.phone}
                  onChangeText={(text) => updateForm('phone', text.replace(/[^0-9]/g, ''))}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  className="flex-1 px-4 py-3 text-gray-900"
                />
              </View>
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">Email</Text>
              <TextInput
                value={form.email}
                onChangeText={(v) => updateForm('email', v)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">Password</Text>
              <TextInput
                value={form.password}
                onChangeText={(v) => updateForm('password', v)}
                placeholder="Create a password"
                secureTextEntry
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-medium mb-2">Business Name *</Text>
              <TextInput
                value={form.business_name}
                onChangeText={(v) => updateForm('business_name', v)}
                placeholder="Enter your business name"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
              />
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            className={`mt-8 py-4 rounded-lg items-center ${
              isLoading ? 'bg-primary-300' : 'bg-primary-600'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary-600 font-semibold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
