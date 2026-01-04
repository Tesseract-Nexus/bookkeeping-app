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
  Calculator,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  IndianRupee,
  Calendar,
  Download,
  Upload,
  Shield,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const taxSummary = {
  totalGstCollected: 245000,
  totalGstPaid: 125000,
  netGstPayable: 120000,
  tdsPending: 35000,
  tcsCollected: 8500,
};

const gstReturns = [
  { id: '1', type: 'GSTR-1', period: 'December 2025', status: 'pending', dueDate: '2026-01-11' },
  { id: '2', type: 'GSTR-3B', period: 'December 2025', status: 'pending', dueDate: '2026-01-20' },
  { id: '3', type: 'GSTR-1', period: 'November 2025', status: 'filed', dueDate: '2025-12-11' },
  { id: '4', type: 'GSTR-3B', period: 'November 2025', status: 'filed', dueDate: '2025-12-20' },
];

const taxModules = [
  { id: 'gstr1', title: 'GSTR-1', description: 'Outward supplies', icon: Upload, route: '/tax/gstr1' },
  { id: 'gstr3b', title: 'GSTR-3B', description: 'Monthly summary', icon: FileText, route: '/tax/gstr3b' },
  { id: 'itc', title: 'ITC', description: 'Input Tax Credit', icon: TrendingDown, route: '/tax/itc' },
  { id: 'tds', title: 'TDS', description: 'Tax Deducted', icon: Shield, route: '/tax/tds' },
  { id: 'tcs', title: 'TCS', description: 'Tax Collected', icon: TrendingUp, route: '/tax/tcs' },
  { id: 'einvoice', title: 'E-Invoice', description: 'Generate IRN', icon: FileText, route: '/tax/einvoice' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'filed':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock };
    case 'overdue':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock };
  }
};

export default function TaxScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Tax & GST</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Manage tax compliance</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
          <Calendar size={20} className="text-gray-600 dark:text-gray-300" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tax Summary Cards */}
        <View className="p-4">
          <Animated.View
            entering={FadeInUp.duration(400).delay(100)}
            className="bg-gradient-to-r from-primary to-purple-600 rounded-xl p-5 mb-4"
          >
            <View className="flex-row items-center mb-3">
              <Calculator size={24} className="text-white mr-2" />
              <Text className="text-lg font-bold text-white">GST Summary</Text>
            </View>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-white/80 text-xs">Collected</Text>
                <Text className="text-white text-lg font-bold">{formatCurrency(taxSummary.totalGstCollected)}</Text>
              </View>
              <View>
                <Text className="text-white/80 text-xs">Paid (ITC)</Text>
                <Text className="text-white text-lg font-bold">{formatCurrency(taxSummary.totalGstPaid)}</Text>
              </View>
              <View>
                <Text className="text-white/80 text-xs">Net Payable</Text>
                <Text className="text-white text-lg font-bold">{formatCurrency(taxSummary.netGstPayable)}</Text>
              </View>
            </View>
          </Animated.View>

          <View className="flex-row gap-3">
            <Animated.View
              entering={FadeInUp.duration(400).delay(150)}
              className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center mb-2">
                <View className="p-2 rounded-lg bg-orange-100">
                  <Shield size={16} className="text-orange-600" />
                </View>
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">TDS Pending</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(taxSummary.tdsPending)}</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center mb-2">
                <View className="p-2 rounded-lg bg-blue-100">
                  <TrendingUp size={16} className="text-blue-600" />
                </View>
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">TCS Collected</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(taxSummary.tcsCollected)}</Text>
            </Animated.View>
          </View>
        </View>

        {/* Tax Modules */}
        <View className="px-4 mb-4">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(250)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            Tax Modules
          </Animated.Text>
          <View className="flex-row flex-wrap gap-3">
            {taxModules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Animated.View
                  key={module.id}
                  entering={FadeInUp.duration(400).delay(300 + index * 50)}
                  className="w-[31%]"
                >
                  <TouchableOpacity
                    onPress={() => router.push(module.route as never)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 items-center active:scale-[0.98]"
                    activeOpacity={0.7}
                  >
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                      <Icon size={20} className="text-primary" />
                    </View>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white text-center">{module.title}</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5">{module.description}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Recent Returns */}
        <View className="px-4 mb-6">
          <Animated.View
            entering={FadeInUp.duration(400).delay(500)}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-base font-semibold text-gray-900 dark:text-white">Recent Returns</Text>
            <TouchableOpacity>
              <Text className="text-sm text-primary font-medium">View All</Text>
            </TouchableOpacity>
          </Animated.View>

          {gstReturns.map((returnItem, index) => {
            const statusStyle = getStatusStyle(returnItem.status);
            const StatusIcon = statusStyle.icon;
            return (
              <Animated.View
                key={returnItem.id}
                entering={FadeInUp.duration(400).delay(550 + index * 50)}
              >
                <TouchableOpacity
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-2 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                        <FileText size={18} className="text-primary" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">{returnItem.type}</Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400">{returnItem.period}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <View className={`flex-row items-center px-2 py-1 rounded-full ${statusStyle.bg}`}>
                        <StatusIcon size={12} className={statusStyle.text} />
                        <Text className={`text-xs font-medium ml-1 capitalize ${statusStyle.text}`}>{returnItem.status}</Text>
                      </View>
                      <Text className="text-xs text-gray-400 mt-1">
                        Due: {new Date(returnItem.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
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
          entering={FadeInUp.duration(400).delay(700)}
          className="mx-4 mb-8"
        >
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-primary rounded-xl py-3 active:opacity-80">
              <Upload size={18} className="text-white mr-2" />
              <Text className="text-white font-semibold">File Return</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-xl py-3 active:opacity-80">
              <Download size={18} className="text-gray-700 dark:text-gray-300 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 font-semibold">Export</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
