import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../../src/lib/api';

type TransactionType = 'sale' | 'expense' | 'payment' | 'receipt';

interface QuickEntry {
  type: TransactionType;
  amount: string;
  description: string;
  party_name: string;
  payment_mode: 'cash' | 'bank' | 'upi';
}

export default function AddScreen() {
  const queryClient = useQueryClient();
  const [entry, setEntry] = useState<QuickEntry>({
    type: 'sale',
    amount: '',
    description: '',
    party_name: '',
    payment_mode: 'cash',
  });

  const transactionTypes: { key: TransactionType; label: string; icon: string; color: string }[] = [
    { key: 'sale', label: 'Sale', icon: 'arrow-down', color: '#10B981' },
    { key: 'expense', label: 'Expense', icon: 'wallet', color: '#D97706' },
    { key: 'payment', label: 'Payment Out', icon: 'arrow-up', color: '#EF4444' },
    { key: 'receipt', label: 'Payment In', icon: 'arrow-down', color: '#10B981' },
  ];

  const paymentModes: { key: 'cash' | 'bank' | 'upi'; label: string; icon: string }[] = [
    { key: 'cash', label: 'Cash', icon: 'cash' },
    { key: 'bank', label: 'Bank', icon: 'business' },
    { key: 'upi', label: 'UPI', icon: 'phone-portrait' },
  ];

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(entry.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (entry.type === 'sale') {
        return api.transactions.quickSale({
          amount,
          description: entry.description || 'Quick Sale',
          payment_mode: entry.payment_mode,
          party_name: entry.party_name || undefined,
        });
      } else if (entry.type === 'expense') {
        return api.transactions.quickExpense({
          amount,
          description: entry.description || 'Expense',
          payment_mode: entry.payment_mode,
          category: 'general',
        });
      } else {
        return api.transactions.create({
          type: entry.type,
          amount,
          description: entry.description,
          party_name: entry.party_name,
          payment_mode: entry.payment_mode,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('Success', 'Transaction recorded successfully');
      setEntry({
        type: 'sale',
        amount: '',
        description: '',
        party_name: '',
        payment_mode: 'cash',
      });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create transaction');
    },
  });

  const updateEntry = (key: keyof QuickEntry, value: string) => {
    setEntry((prev) => ({ ...prev, [key]: value }));
  };

  const selectedType = transactionTypes.find((t) => t.key === entry.type);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="bg-white pt-12 pb-6 px-4 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 mb-2">Quick Add</Text>
          <Text className="text-gray-500">Record a transaction quickly</Text>
        </View>

        <View className="px-4 py-6">
          {/* Transaction Type Selection */}
          <Text className="text-gray-700 font-medium mb-3">Transaction Type</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {transactionTypes.map((type) => (
              <TouchableOpacity
                key={type.key}
                onPress={() => updateEntry('type', type.key)}
                className={`flex-row items-center px-4 py-3 rounded-xl ${
                  entry.type === type.key ? 'bg-primary-50 border-2 border-primary-600' : 'bg-white border border-gray-200'
                }`}
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-2"
                  style={{ backgroundColor: type.color + '20' }}
                >
                  <Ionicons name={type.icon as any} size={18} color={type.color} />
                </View>
                <Text
                  className={`font-medium ${
                    entry.type === type.key ? 'text-primary-600' : 'text-gray-700'
                  }`}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount Input */}
          <Text className="text-gray-700 font-medium mb-2">Amount *</Text>
          <View className="bg-white rounded-xl border border-gray-200 mb-4">
            <View className="flex-row items-center px-4 py-4">
              <Text className="text-gray-500 text-xl mr-2">₹</Text>
              <TextInput
                value={entry.amount}
                onChangeText={(text) => updateEntry('amount', text.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                keyboardType="numeric"
                className="flex-1 text-3xl font-bold text-gray-900"
                placeholderTextColor="#D1D5DB"
              />
            </View>
          </View>

          {/* Description */}
          <Text className="text-gray-700 font-medium mb-2">Description</Text>
          <TextInput
            value={entry.description}
            onChangeText={(text) => updateEntry('description', text)}
            placeholder={`Enter ${entry.type} description`}
            className="bg-white rounded-xl border border-gray-200 px-4 py-4 text-gray-900 mb-4"
            placeholderTextColor="#9CA3AF"
          />

          {/* Party Name (for sales and receipts) */}
          {['sale', 'receipt', 'payment'].includes(entry.type) && (
            <>
              <Text className="text-gray-700 font-medium mb-2">
                {entry.type === 'payment' ? 'Vendor Name' : 'Customer Name'}
              </Text>
              <TextInput
                value={entry.party_name}
                onChangeText={(text) => updateEntry('party_name', text)}
                placeholder="Enter name (optional)"
                className="bg-white rounded-xl border border-gray-200 px-4 py-4 text-gray-900 mb-4"
                placeholderTextColor="#9CA3AF"
              />
            </>
          )}

          {/* Payment Mode */}
          <Text className="text-gray-700 font-medium mb-3">Payment Mode</Text>
          <View className="flex-row gap-3 mb-8">
            {paymentModes.map((mode) => (
              <TouchableOpacity
                key={mode.key}
                onPress={() => setEntry((prev) => ({ ...prev, payment_mode: mode.key }))}
                className={`flex-1 items-center py-4 rounded-xl ${
                  entry.payment_mode === mode.key
                    ? 'bg-primary-50 border-2 border-primary-600'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <Ionicons
                  name={mode.icon as any}
                  size={24}
                  color={entry.payment_mode === mode.key ? '#4F46E5' : '#9CA3AF'}
                />
                <Text
                  className={`mt-1 font-medium ${
                    entry.payment_mode === mode.key ? 'text-primary-600' : 'text-gray-500'
                  }`}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending || !entry.amount}
            className={`py-4 rounded-xl items-center flex-row justify-center ${
              createMutation.isPending || !entry.amount ? 'bg-primary-300' : 'bg-primary-600'
            }`}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text className="text-white font-semibold text-lg ml-2">
                  Record {selectedType?.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
