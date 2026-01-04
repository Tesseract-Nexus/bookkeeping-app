import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Receipt,
  Calendar,
  CreditCard,
  TrendingDown,
  Upload,
  Eye,
  Edit,
  Trash2,
  FileText,
  Tag,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  vendor: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'reimbursable';
  receipt: boolean;
}

const sampleExpenses: Expense[] = [
  { id: '1', date: '2025-12-28', description: 'Office Supplies', category: 'Office Expenses', vendor: 'Staples', amount: 2500, paymentMethod: 'Credit Card', status: 'paid', receipt: true },
  { id: '2', date: '2025-12-27', description: 'Team Lunch', category: 'Meals & Entertainment', vendor: 'Restaurant ABC', amount: 3200, paymentMethod: 'Cash', status: 'reimbursable', receipt: true },
  { id: '3', date: '2025-12-26', description: 'Software Subscription', category: 'Software & IT', vendor: 'Adobe Inc', amount: 15000, paymentMethod: 'Bank Transfer', status: 'paid', receipt: true },
  { id: '4', date: '2025-12-25', description: 'Travel - Client Meeting', category: 'Travel', vendor: 'Uber', amount: 850, paymentMethod: 'Credit Card', status: 'paid', receipt: false },
  { id: '5', date: '2025-12-24', description: 'Internet Bill', category: 'Utilities', vendor: 'Airtel', amount: 1299, paymentMethod: 'Auto Debit', status: 'pending', receipt: true },
  { id: '6', date: '2025-12-23', description: 'Marketing Materials', category: 'Marketing', vendor: 'PrintHub', amount: 8500, paymentMethod: 'Bank Transfer', status: 'paid', receipt: true },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    'Office Expenses': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Meals & Entertainment': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'Software & IT': { bg: 'bg-purple-100', text: 'text-purple-700' },
    'Travel': { bg: 'bg-green-100', text: 'text-green-700' },
    'Utilities': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    'Marketing': { bg: 'bg-pink-100', text: 'text-pink-700' },
  };
  return colors[category] || { bg: 'bg-gray-100', text: 'text-gray-700' };
};

const statusStyles = {
  paid: { bg: 'bg-green-100', text: 'text-green-700' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  reimbursable: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function ExpensesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const totalExpenses = sampleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = sampleExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = sampleExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const reimbursableExpenses = sampleExpenses.filter(e => e.status === 'reimbursable').reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = sampleExpenses.filter(expense =>
    expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = [
    { label: 'Total', value: totalExpenses, icon: TrendingDown, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { label: 'Paid', value: paidExpenses, icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100' },
    { label: 'Pending', value: pendingExpenses, icon: Calendar, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { label: 'Reimbursable', value: reimbursableExpenses, icon: Receipt, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ];

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
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Expenses</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Track your spending</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/expenses/new')}
          className="p-2 rounded-full bg-primary"
        >
          <Plus size={20} className="text-white" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View className="p-4">
          <View className="flex-row flex-wrap gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Animated.View
                  key={stat.label}
                  entering={FadeInUp.duration(400).delay(index * 100)}
                  className="flex-1 min-w-[45%] bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <View className="flex-row items-center gap-2">
                    <View className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon size={16} className={stat.color} />
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</Text>
                  </View>
                  <Text className={`text-lg font-bold mt-2 ${stat.color}`}>
                    {formatCurrency(stat.value)}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Search */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
          className="px-4 mb-4"
        >
          <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3">
            <Search size={18} className="text-gray-400" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search expenses..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 py-3 px-2 text-gray-900 dark:text-white"
            />
            <TouchableOpacity className="p-2">
              <Filter size={18} className="text-gray-400" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Expense List */}
        <View className="px-4 pb-6">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            {filteredExpenses.length} Expenses
          </Text>

          {filteredExpenses.map((expense, index) => {
            const categoryColor = getCategoryColor(expense.category);
            const status = statusStyles[expense.status];

            return (
              <Animated.View
                key={expense.id}
                entering={FadeInUp.duration(400).delay(300 + index * 50)}
              >
                <TouchableOpacity
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {expense.description}
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {expense.vendor}
                      </Text>
                    </View>
                    <Text className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-center gap-2">
                      <View className={`flex-row items-center px-2 py-1 rounded-full ${categoryColor.bg}`}>
                        <Tag size={12} className={categoryColor.text} />
                        <Text className={`text-xs ml-1 font-medium ${categoryColor.text}`}>
                          {expense.category}
                        </Text>
                      </View>
                      <View className={`px-2 py-1 rounded-full ${status.bg}`}>
                        <Text className={`text-xs font-medium capitalize ${status.text}`}>
                          {expense.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {expense.paymentMethod}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      {expense.receipt ? (
                        <TouchableOpacity className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <FileText size={14} className="text-primary" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <Upload size={14} className="text-gray-400" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <Eye size={14} className="text-gray-500" />
                      </TouchableOpacity>
                      <TouchableOpacity className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <Edit size={14} className="text-gray-500" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(500)}
        className="absolute bottom-6 right-6"
      >
        <TouchableOpacity
          onPress={() => router.push('/expenses/new')}
          className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Plus size={24} className="text-white" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
