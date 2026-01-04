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
  Calendar,
  Tag,
  Building,
  CreditCard,
  FileText,
  Upload,
  Camera,
  Check,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const categories = [
  { name: 'Office Expenses', value: 'office' },
  { name: 'Travel', value: 'travel' },
  { name: 'Meals & Entertainment', value: 'meals' },
  { name: 'Software & IT', value: 'software' },
  { name: 'Utilities', value: 'utilities' },
  { name: 'Marketing', value: 'marketing' },
];

const paymentMethods = [
  { name: 'Credit Card', value: 'credit_card' },
  { name: 'Debit Card', value: 'debit_card' },
  { name: 'Cash', value: 'cash' },
  { name: 'Bank Transfer', value: 'bank_transfer' },
  { name: 'UPI', value: 'upi' },
];

export default function NewExpenseScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    notes: '',
  });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  const handleSave = () => {
    // Save logic here
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

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
          <Text className="text-xl font-bold text-gray-900 dark:text-white">Add Expense</Text>
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
            {/* Receipt Upload */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(100)}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 items-center"
            >
              <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Camera size={32} className="text-primary" />
              </View>
              <Text className="text-base font-semibold text-gray-900 dark:text-white">Upload Receipt</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                Take a photo or upload from gallery
              </Text>
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity className="flex-row items-center px-4 py-2 rounded-lg bg-primary/10">
                  <Camera size={16} className="text-primary mr-2" />
                  <Text className="text-primary font-medium">Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <Upload size={16} className="text-gray-600 dark:text-gray-300 mr-2" />
                  <Text className="text-gray-600 dark:text-gray-300 font-medium">Gallery</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Description */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(150)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <FileText size={18} className="text-gray-400 mr-3" />
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</Text>
              </View>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="What was this expense for?"
                placeholderTextColor="#9CA3AF"
                className="px-4 py-3 text-base text-gray-900 dark:text-white"
              />
            </Animated.View>

            {/* Amount */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-lg font-bold text-gray-400 mr-3">₹</Text>
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</Text>
              </View>
              <TextInput
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                className="px-4 py-3 text-2xl font-bold text-gray-900 dark:text-white"
              />
            </Animated.View>

            {/* Category */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(250)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center">
                  <Tag size={18} className="text-gray-400 mr-3" />
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</Text>
                </View>
                <Text className="text-base text-gray-900 dark:text-white">
                  {formData.category || 'Select category'}
                </Text>
              </TouchableOpacity>
              {showCategoryPicker && (
                <View className="border-t border-gray-100 dark:border-gray-700">
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => {
                        setFormData({ ...formData, category: cat.name });
                        setShowCategoryPicker(false);
                      }}
                      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700"
                    >
                      <Text className="text-gray-900 dark:text-white">{cat.name}</Text>
                      {formData.category === cat.name && (
                        <Check size={18} className="text-primary" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Vendor */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(300)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Building size={18} className="text-gray-400 mr-3" />
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Vendor</Text>
              </View>
              <TextInput
                value={formData.vendor}
                onChangeText={(text) => setFormData({ ...formData, vendor: text })}
                placeholder="Vendor name"
                placeholderTextColor="#9CA3AF"
                className="px-4 py-3 text-base text-gray-900 dark:text-white"
              />
            </Animated.View>

            {/* Date */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(350)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <TouchableOpacity className="flex-row items-center justify-between px-4 py-4">
                <View className="flex-row items-center">
                  <Calendar size={18} className="text-gray-400 mr-3" />
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</Text>
                </View>
                <Text className="text-base text-gray-900 dark:text-white">
                  {new Date(formData.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Payment Method */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(400)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <TouchableOpacity
                onPress={() => setShowPaymentPicker(!showPaymentPicker)}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center">
                  <CreditCard size={18} className="text-gray-400 mr-3" />
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Method</Text>
                </View>
                <Text className="text-base text-gray-900 dark:text-white">
                  {formData.paymentMethod || 'Select method'}
                </Text>
              </TouchableOpacity>
              {showPaymentPicker && (
                <View className="border-t border-gray-100 dark:border-gray-700">
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.value}
                      onPress={() => {
                        setFormData({ ...formData, paymentMethod: method.name });
                        setShowPaymentPicker(false);
                      }}
                      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700"
                    >
                      <Text className="text-gray-900 dark:text-white">{method.name}</Text>
                      {formData.paymentMethod === method.name && (
                        <Check size={18} className="text-primary" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Notes */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(450)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6"
            >
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <FileText size={18} className="text-gray-400 mr-3" />
                <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</Text>
              </View>
              <TextInput
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Additional notes (optional)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                className="px-4 py-3 text-base text-gray-900 dark:text-white min-h-[80px]"
                textAlignVertical="top"
              />
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
