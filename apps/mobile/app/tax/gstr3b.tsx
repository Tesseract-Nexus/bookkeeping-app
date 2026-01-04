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
  Upload,
  Download,
  FileText,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  MinusCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const gstr3bData = {
  period: 'December 2025',
  dueDate: '2026-01-20',
  outwardSupplies: { taxable: 1700000, igst: 153000, cgst: 76500, sgst: 76500 },
  inwardSupplies: { taxable: 850000, igst: 76500, cgst: 38250, sgst: 38250 },
  itcAvailable: { igst: 76500, cgst: 38250, sgst: 38250 },
  netTaxPayable: { igst: 76500, cgst: 38250, sgst: 38250 },
};

export default function GSTR3BScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const totalOutward = gstr3bData.outwardSupplies.igst + gstr3bData.outwardSupplies.cgst + gstr3bData.outwardSupplies.sgst;
  const totalITC = gstr3bData.itcAvailable.igst + gstr3bData.itcAvailable.cgst + gstr3bData.itcAvailable.sgst;
  const totalPayable = gstr3bData.netTaxPayable.igst + gstr3bData.netTaxPayable.cgst + gstr3bData.netTaxPayable.sgst;

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
            <Text className="text-xl font-bold text-gray-900 dark:text-white">GSTR-3B</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Monthly Summary Return</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
          <Calendar size={18} className="text-gray-600 dark:text-gray-300" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Card */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          className="m-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-5"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white/80 text-sm">Filing Period</Text>
            <View className="flex-row items-center px-2 py-1 rounded-full bg-yellow-400">
              <Clock size={12} className="text-yellow-900" />
              <Text className="text-xs font-medium text-yellow-900 ml-1">Pending</Text>
            </View>
          </View>
          <Text className="text-2xl font-bold text-white mb-1">{gstr3bData.period}</Text>
          <Text className="text-white/80 text-sm">Due: {new Date(gstr3bData.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </Animated.View>

        {/* Tax Summary */}
        <View className="px-4 mb-4">
          <View className="flex-row gap-3">
            <Animated.View
              entering={FadeInUp.duration(400).delay(150)}
              className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center mb-2">
                <TrendingUp size={16} className="text-blue-600 mr-2" />
                <Text className="text-xs text-gray-500 dark:text-gray-400">Output Tax</Text>
              </View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalOutward)}</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center mb-2">
                <TrendingDown size={16} className="text-green-600 mr-2" />
                <Text className="text-xs text-gray-500 dark:text-gray-400">ITC Available</Text>
              </View>
              <Text className="text-lg font-bold text-green-600">{formatCurrency(totalITC)}</Text>
            </Animated.View>
          </View>
          <Animated.View
            entering={FadeInUp.duration(400).delay(250)}
            className="mt-3 bg-primary/10 rounded-xl p-4 border border-primary/20"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <MinusCircle size={18} className="text-primary mr-2" />
                <Text className="text-sm font-medium text-gray-900 dark:text-white">Net Tax Payable</Text>
              </View>
              <Text className="text-xl font-bold text-primary">{formatCurrency(totalPayable)}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Outward Supplies */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">3.1 Outward Supplies</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Taxable Value</Text>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(gstr3bData.outwardSupplies.taxable)}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400">IGST</Text>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(gstr3bData.outwardSupplies.igst)}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400">CGST</Text>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(gstr3bData.outwardSupplies.cgst)}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-sm text-gray-600 dark:text-gray-400">SGST</Text>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(gstr3bData.outwardSupplies.sgst)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ITC Available */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(350)}
          className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">4. Eligible ITC</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400">IGST</Text>
              <Text className="text-sm font-semibold text-green-600">{formatCurrency(gstr3bData.itcAvailable.igst)}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-400">CGST</Text>
              <Text className="text-sm font-semibold text-green-600">{formatCurrency(gstr3bData.itcAvailable.cgst)}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-sm text-gray-600 dark:text-gray-400">SGST</Text>
              <Text className="text-sm font-semibold text-green-600">{formatCurrency(gstr3bData.itcAvailable.sgst)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(400)}
          className="mx-4 mb-8"
        >
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-primary rounded-xl py-3.5 active:opacity-80">
              <Upload size={18} className="text-white mr-2" />
              <Text className="text-white font-semibold">File GSTR-3B</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-xl py-3.5 active:opacity-80">
              <Download size={18} className="text-gray-700 dark:text-gray-300 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 font-semibold">Export</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
