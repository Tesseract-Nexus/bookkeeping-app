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
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
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

const gstr1Data = {
  period: 'December 2025',
  dueDate: '2026-01-11',
  status: 'pending',
  b2b: { count: 45, taxable: 1250000, igst: 112500, cgst: 56250, sgst: 56250 },
  b2c: { count: 120, taxable: 450000, igst: 40500, cgst: 20250, sgst: 20250 },
  cdnr: { count: 5, taxable: 25000, igst: 2250, cgst: 1125, sgst: 1125 },
  exports: { count: 8, taxable: 320000, igst: 0, cgst: 0, sgst: 0 },
};

const sections = [
  { id: 'b2b', title: 'B2B Invoices', desc: 'Registered recipients', data: gstr1Data.b2b },
  { id: 'b2c', title: 'B2C Large', desc: 'Unregistered recipients', data: gstr1Data.b2c },
  { id: 'cdnr', title: 'Credit/Debit Notes', desc: 'To registered persons', data: gstr1Data.cdnr },
  { id: 'exports', title: 'Exports', desc: 'Zero-rated supplies', data: gstr1Data.exports },
];

export default function GSTR1Screen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const totalTax = sections.reduce((sum, s) => sum + s.data.igst + s.data.cgst + s.data.sgst, 0);

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
            <Text className="text-xl font-bold text-gray-900 dark:text-white">GSTR-1</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">Outward Supplies</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
            <Filter size={18} className="text-gray-600 dark:text-gray-300" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
            <Calendar size={18} className="text-gray-600 dark:text-gray-300" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Card */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          className="m-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white/80 text-sm">Filing Period</Text>
            <View className="flex-row items-center px-2 py-1 rounded-full bg-yellow-400">
              <Clock size={12} className="text-yellow-900" />
              <Text className="text-xs font-medium text-yellow-900 ml-1">Pending</Text>
            </View>
          </View>
          <Text className="text-2xl font-bold text-white mb-1">{gstr1Data.period}</Text>
          <Text className="text-white/80 text-sm">Due: {new Date(gstr1Data.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
          <View className="mt-4 pt-4 border-t border-white/20">
            <Text className="text-white/80 text-sm">Total Tax Liability</Text>
            <Text className="text-2xl font-bold text-white">{formatCurrency(totalTax)}</Text>
          </View>
        </Animated.View>

        {/* Sections */}
        <View className="px-4 mb-4">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(200)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            Supply Details
          </Animated.Text>

          {sections.map((section, index) => (
            <Animated.View
              key={section.id}
              entering={FadeInUp.duration(400).delay(250 + index * 50)}
            >
              <TouchableOpacity
                className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                      <FileText size={18} className="text-primary" />
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">{section.title}</Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">{section.desc}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <View className="px-2 py-1 rounded-full bg-primary/10">
                      <Text className="text-xs font-medium text-primary">{section.data.count} invoices</Text>
                    </View>
                  </View>
                </View>
                <View className="flex-row justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Taxable</Text>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(section.data.taxable)}</Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">IGST</Text>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(section.data.igst)}</Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">CGST</Text>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(section.data.cgst)}</Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">SGST</Text>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(section.data.sgst)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Actions */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(500)}
          className="mx-4 mb-8"
        >
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-primary rounded-xl py-3.5 active:opacity-80">
              <Upload size={18} className="text-white mr-2" />
              <Text className="text-white font-semibold">File GSTR-1</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-xl py-3.5 active:opacity-80">
              <Download size={18} className="text-gray-700 dark:text-gray-300 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 font-semibold">Export JSON</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
