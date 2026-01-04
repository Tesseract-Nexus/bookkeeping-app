import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  User,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function NewVendorScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    paymentTerms: '30',
    bankName: '',
    accountNumber: '',
    ifsc: '',
  });

  const handleSave = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">Add Vendor</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          className="px-4 py-2 rounded-full bg-primary"
        >
          <Text className="text-white font-semibold">Save</Text>
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="p-4 space-y-4">
            {/* Basic Info */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(100)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">Basic Information</Text>
              </View>

              <View className="p-4 space-y-4">
                <View>
                  <View className="flex-row items-center mb-2">
                    <Building size={16} className="text-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">Business Name *</Text>
                  </View>
                  <TextInput
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Enter vendor name"
                    placeholderTextColor="#9CA3AF"
                    className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <FileText size={16} className="text-gray-400 mr-2" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">GSTIN</Text>
                    </View>
                    <TextInput
                      value={formData.gstin}
                      onChangeText={(text) => setFormData({ ...formData, gstin: text.toUpperCase() })}
                      placeholder="27AABCT1234P1ZP"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <FileText size={16} className="text-gray-400 mr-2" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">PAN</Text>
                    </View>
                    <TextInput
                      value={formData.pan}
                      onChangeText={(text) => setFormData({ ...formData, pan: text.toUpperCase() })}
                      placeholder="AABCT1234P"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Contact Info */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(150)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">Contact Information</Text>
              </View>

              <View className="p-4 space-y-4">
                <View>
                  <View className="flex-row items-center mb-2">
                    <User size={16} className="text-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">Contact Person</Text>
                  </View>
                  <TextInput
                    value={formData.contactPerson}
                    onChangeText={(text) => setFormData({ ...formData, contactPerson: text })}
                    placeholder="Contact person name"
                    placeholderTextColor="#9CA3AF"
                    className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Phone size={16} className="text-gray-400 mr-2" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">Phone *</Text>
                    </View>
                    <TextInput
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      placeholder="+91 98765 43210"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Mail size={16} className="text-gray-400 mr-2" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">Email</Text>
                    </View>
                    <TextInput
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      placeholder="email@vendor.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Address */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">Address</Text>
              </View>

              <View className="p-4 space-y-4">
                <View>
                  <View className="flex-row items-center mb-2">
                    <MapPin size={16} className="text-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">Street Address</Text>
                  </View>
                  <TextInput
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    placeholder="Street address"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white min-h-[60px]"
                    textAlignVertical="top"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">City</Text>
                    <TextInput
                      value={formData.city}
                      onChangeText={(text) => setFormData({ ...formData, city: text })}
                      placeholder="City"
                      placeholderTextColor="#9CA3AF"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">State</Text>
                    <TextInput
                      value={formData.state}
                      onChangeText={(text) => setFormData({ ...formData, state: text })}
                      placeholder="State"
                      placeholderTextColor="#9CA3AF"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                  <View className="w-24">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">PIN</Text>
                    <TextInput
                      value={formData.pincode}
                      onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                      placeholder="PIN"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      maxLength={6}
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Bank Details */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(250)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6"
            >
              <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">Bank Details</Text>
              </View>

              <View className="p-4 space-y-4">
                <View>
                  <View className="flex-row items-center mb-2">
                    <CreditCard size={16} className="text-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">Bank Name</Text>
                  </View>
                  <TextInput
                    value={formData.bankName}
                    onChangeText={(text) => setFormData({ ...formData, bankName: text })}
                    placeholder="Bank name"
                    placeholderTextColor="#9CA3AF"
                    className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">Account Number</Text>
                    <TextInput
                      value={formData.accountNumber}
                      onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                      placeholder="Account number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">IFSC Code</Text>
                    <TextInput
                      value={formData.ifsc}
                      onChangeText={(text) => setFormData({ ...formData, ifsc: text.toUpperCase() })}
                      placeholder="IFSC code"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
