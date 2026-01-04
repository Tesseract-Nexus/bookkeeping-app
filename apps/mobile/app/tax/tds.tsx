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
  Shield,
  Plus,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building,
  Calendar,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const tdsSummary = {
  totalDeducted: 245000,
  totalDeposited: 210000,
  pending: 35000,
  thisMonth: 28000,
};

const tdsEntries = [
  { id: '1', vendor: 'ABC Consultants', section: '194J', amount: 100000, tds: 10000, rate: 10, status: 'deposited', date: '2025-12-28' },
  { id: '2', vendor: 'XYZ Tech Services', section: '194C', amount: 50000, tds: 1000, rate: 2, status: 'deposited', date: '2025-12-27' },
  { id: '3', vendor: 'Legal Associates', section: '194J', amount: 80000, tds: 8000, rate: 10, status: 'pending', date: '2025-12-26' },
  { id: '4', vendor: 'Digital Marketing Co', section: '194J', amount: 150000, tds: 15000, rate: 10, status: 'pending', date: '2025-12-25' },
  { id: '5', vendor: 'Freelance Developer', section: '194J', amount: 120000, tds: 12000, rate: 10, status: 'deposited', date: '2025-12-24' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'deposited':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock };
    case 'overdue':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock };
  }
};

export default function TDSScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
            <Text className="text-xl font-bold text-gray-900 dark:text-white">TDS</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Tax Deducted at Source</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2 rounded-full bg-primary">
          <Plus size={18} className="text-white" />
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
          className="m-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5"
        >
          <View className="flex-row items-center mb-3">
            <Shield size={24} className="text-white mr-2" />
            <Text className="text-lg font-bold text-white">TDS Summary</Text>
          </View>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-white/80 text-xs">Deducted</Text>
              <Text className="text-white text-lg font-bold">{formatCurrency(tdsSummary.totalDeducted)}</Text>
            </View>
            <View>
              <Text className="text-white/80 text-xs">Deposited</Text>
              <Text className="text-white text-lg font-bold">{formatCurrency(tdsSummary.totalDeposited)}</Text>
            </View>
            <View>
              <Text className="text-white/80 text-xs">Pending</Text>
              <Text className="text-white text-lg font-bold">{formatCurrency(tdsSummary.pending)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <View className="px-4 mb-4 flex-row gap-3">
          <Animated.View
            entering={FadeInUp.duration(400).delay(150)}
            className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <View className="flex-row items-center mb-2">
              <Calendar size={16} className="text-primary mr-2" />
              <Text className="text-xs text-gray-500 dark:text-gray-400">This Month</Text>
            </View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(tdsSummary.thisMonth)}</Text>
          </Animated.View>
          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700"
          >
            <View className="flex-row items-center mb-2">
              <Clock size={16} className="text-yellow-600 mr-2" />
              <Text className="text-xs text-yellow-700 dark:text-yellow-400">Due Soon</Text>
            </View>
            <Text className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{formatCurrency(tdsSummary.pending)}</Text>
          </Animated.View>
        </View>

        {/* TDS Entries */}
        <View className="px-4 mb-6">
          <Animated.View
            entering={FadeInUp.duration(400).delay(250)}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-base font-semibold text-gray-900 dark:text-white">TDS Entries</Text>
            <TouchableOpacity className="flex-row items-center">
              <Download size={16} className="text-primary mr-1" />
              <Text className="text-sm text-primary font-medium">Export</Text>
            </TouchableOpacity>
          </Animated.View>

          {tdsEntries.map((entry, index) => {
            const statusStyle = getStatusStyle(entry.status);
            const StatusIcon = statusStyle.icon;
            return (
              <Animated.View
                key={entry.id}
                entering={FadeInUp.duration(400).delay(300 + index * 50)}
              >
                <TouchableOpacity
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-2 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Building size={14} className="text-gray-400 mr-1.5" />
                        <Text className="text-sm font-semibold text-gray-900 dark:text-white">{entry.vendor}</Text>
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Section {entry.section} @ {entry.rate}%
                      </Text>
                    </View>
                    <View className={`flex-row items-center px-2 py-1 rounded-full ${statusStyle.bg}`}>
                      <StatusIcon size={12} className={statusStyle.text} />
                      <Text className={`text-xs font-medium ml-1 capitalize ${statusStyle.text}`}>{entry.status}</Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Payment</Text>
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(entry.amount)}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">TDS</Text>
                      <Text className="text-sm font-bold text-orange-600">{formatCurrency(entry.tds)}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Date</Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(550)}
          className="mx-4 mb-8"
        >
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-primary rounded-xl py-3.5 active:opacity-80">
              <Plus size={18} className="text-white mr-2" />
              <Text className="text-white font-semibold">New TDS</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-xl py-3.5 active:opacity-80">
              <FileText size={18} className="text-gray-700 dark:text-gray-300 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 font-semibold">Challan</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
