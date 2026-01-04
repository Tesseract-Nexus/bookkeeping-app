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
  Calendar,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  rate: string;
  gstRate: string;
}

export default function NewBillScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    vendor: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: '1', rate: '', gstRate: '18' },
  ]);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: '1',
      rate: '',
      gstRate: '18',
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return lineItems.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstRate = parseFloat(item.gstRate) || 0;
      const subtotal = quantity * rate;
      const gst = subtotal * (gstRate / 100);
      return total + subtotal + gst;
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          <Text className="text-xl font-bold text-gray-900 dark:text-white">New Bill</Text>
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
            {/* Vendor Selection */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(100)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <TouchableOpacity className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <Building size={18} className="text-gray-400 mr-3" />
                  <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">Select Vendor</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-base text-gray-900 dark:text-white mr-2">
                    {formData.vendor || 'Choose vendor'}
                  </Text>
                  <ChevronDown size={18} className="text-gray-400" />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Bill Details */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(150)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">Bill Details</Text>
              </View>

              <View className="p-4 space-y-4">
                <View>
                  <View className="flex-row items-center mb-2">
                    <FileText size={16} className="text-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400">Bill Number</Text>
                  </View>
                  <TextInput
                    value={formData.billNumber}
                    onChangeText={(text) => setFormData({ ...formData, billNumber: text })}
                    placeholder="Enter bill number"
                    placeholderTextColor="#9CA3AF"
                    className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Calendar size={16} className="text-gray-400 mr-2" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">Bill Date</Text>
                    </View>
                    <TouchableOpacity className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                      <Text className="text-gray-900 dark:text-white">
                        {new Date(formData.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Calendar size={16} className="text-gray-400 mr-2" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400">Due Date</Text>
                    </View>
                    <TouchableOpacity className="py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                      <Text className={formData.dueDate ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                        {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Line Items */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">Items</Text>
                <TouchableOpacity onPress={addLineItem} className="flex-row items-center">
                  <Plus size={16} className="text-primary mr-1" />
                  <Text className="text-sm text-primary font-medium">Add Item</Text>
                </TouchableOpacity>
              </View>

              <View className="p-4 space-y-4">
                {lineItems.map((item, index) => (
                  <View key={item.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Item {index + 1}</Text>
                      {lineItems.length > 1 && (
                        <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                          <Trash2 size={16} className="text-red-500" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TextInput
                      value={item.description}
                      onChangeText={(text) => updateLineItem(item.id, 'description', text)}
                      placeholder="Description"
                      placeholderTextColor="#9CA3AF"
                      className="py-2.5 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-2"
                    />

                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</Text>
                        <TextInput
                          value={item.quantity}
                          onChangeText={(text) => updateLineItem(item.id, 'quantity', text)}
                          placeholder="1"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          className="py-2.5 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rate</Text>
                        <TextInput
                          value={item.rate}
                          onChangeText={(text) => updateLineItem(item.id, 'rate', text)}
                          placeholder="0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          className="py-2.5 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </View>
                      <View className="w-20">
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">GST %</Text>
                        <TextInput
                          value={item.gstRate}
                          onChangeText={(text) => updateLineItem(item.id, 'gstRate', text)}
                          placeholder="18"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                          className="py-2.5 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Total */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(250)}
              className="bg-primary/10 rounded-xl p-4 border border-primary/20"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">Total Amount</Text>
                <Text className="text-xl font-bold text-primary">{formatCurrency(calculateTotal())}</Text>
              </View>
            </Animated.View>

            {/* Notes */}
            <Animated.View
              entering={FadeInUp.duration(400).delay(300)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6"
            >
              <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <FileText size={16} className="text-gray-400 mr-2" />
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">Notes</Text>
              </View>
              <TextInput
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Add notes (optional)"
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
