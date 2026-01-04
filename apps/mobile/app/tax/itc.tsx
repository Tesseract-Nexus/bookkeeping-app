import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  ChevronRight,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const itcSummary = {
  available: { igst: 125000, cgst: 62500, sgst: 62500, cess: 5000 },
  utilized: { igst: 95000, cgst: 45000, sgst: 45000, cess: 3500 },
  reversed: { igst: 5000, cgst: 2500, sgst: 2500, cess: 500 },
  balance: { igst: 25000, cgst: 15000, sgst: 15000, cess: 1000 },
};

const recentITC = [
  { id: '1', vendor: 'Tech Solutions Ltd', invoice: 'INV-2025-001', amount: 15000, status: 'matched', date: '2025-12-28' },
  { id: '2', vendor: 'Office Supplies Co', invoice: 'INV-2025-002', amount: 3500, status: 'matched', date: '2025-12-27' },
  { id: '3', vendor: 'Cloud Services', invoice: 'INV-2025-003', amount: 22500, status: 'pending', date: '2025-12-26' },
  { id: '4', vendor: 'Marketing Agency', invoice: 'INV-2025-004', amount: 8000, status: 'mismatch', date: '2025-12-25' },
  { id: '5', vendor: 'Logistics Partner', invoice: 'INV-2025-005', amount: 12000, status: 'matched', date: '2025-12-24' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'matched':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock };
    case 'mismatch':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock };
  }
};

export default function ITCScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const totalAvailable = Object.values(itcSummary.available).reduce((a, b) => a + b, 0);
  const totalBalance = Object.values(itcSummary.balance).reduce((a, b) => a + b, 0);

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
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Input Tax Credit</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">ITC Management</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
          <Download size={18} className="text-gray-600 dark:text-gray-300" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Card */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          className="m-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-5"
        >
          <View className="flex-row items-center mb-3">
            <TrendingDown size={24} className="text-white mr-2" />
            <Text className="text-lg font-bold text-white">ITC Summary</Text>
          </View>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-white/80 text-xs">Available</Text>
              <Text className="text-white text-xl font-bold">{formatCurrency(totalAvailable)}</Text>
            </View>
            <View>
              <Text className="text-white/80 text-xs">Balance</Text>
              <Text className="text-white text-xl font-bold">{formatCurrency(totalBalance)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ITC Breakdown */}
        <View className="px-4 mb-4">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(150)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            ITC Breakdown
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <View className="flex-row bg-gray-50 dark:bg-gray-700 px-4 py-2">
              <Text className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">Type</Text>
              <Text className="w-20 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">Available</Text>
              <Text className="w-20 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">Utilized</Text>
              <Text className="w-20 text-xs font-medium text-gray-500 dark:text-gray-400 text-right">Balance</Text>
            </View>
            {['igst', 'cgst', 'sgst', 'cess'].map((type, index) => (
              <View
                key={type}
                className={`flex-row px-4 py-3 ${index < 3 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
              >
                <Text className="flex-1 text-sm font-medium text-gray-900 dark:text-white uppercase">{type}</Text>
                <Text className="w-20 text-sm text-gray-600 dark:text-gray-400 text-right">
                  {formatCurrency(itcSummary.available[type as keyof typeof itcSummary.available])}
                </Text>
                <Text className="w-20 text-sm text-gray-600 dark:text-gray-400 text-right">
                  {formatCurrency(itcSummary.utilized[type as keyof typeof itcSummary.utilized])}
                </Text>
                <Text className="w-20 text-sm font-semibold text-green-600 text-right">
                  {formatCurrency(itcSummary.balance[type as keyof typeof itcSummary.balance])}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Recent ITC */}
        <View className="px-4 mb-6">
          <Animated.View
            entering={FadeInUp.duration(400).delay(300)}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-base font-semibold text-gray-900 dark:text-white">Recent ITC Claims</Text>
            <TouchableOpacity>
              <Text className="text-sm text-primary font-medium">View All</Text>
            </TouchableOpacity>
          </Animated.View>

          {recentITC.map((item, index) => {
            const statusStyle = getStatusStyle(item.status);
            const StatusIcon = statusStyle.icon;
            return (
              <Animated.View
                key={item.id}
                entering={FadeInUp.duration(400).delay(350 + index * 50)}
              >
                <TouchableOpacity
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-2 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white">{item.vendor}</Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.invoice}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</Text>
                      <View className={`flex-row items-center px-2 py-0.5 rounded-full mt-1 ${statusStyle.bg}`}>
                        <StatusIcon size={10} className={statusStyle.text} />
                        <Text className={`text-xs font-medium ml-1 capitalize ${statusStyle.text}`}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
