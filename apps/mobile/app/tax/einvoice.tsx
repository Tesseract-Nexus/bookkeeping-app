import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Plus,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  QrCode,
  Copy,
  Download,
  Filter,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const einvoiceSummary = {
  totalGenerated: 245,
  successful: 238,
  pending: 5,
  cancelled: 2,
};

const einvoices = [
  { id: '1', invoiceNo: 'INV-2025-001', customer: 'Tech Corp Ltd', irn: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', amount: 150000, status: 'active', date: '2025-12-28' },
  { id: '2', invoiceNo: 'INV-2025-002', customer: 'Digital Solutions', irn: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1', amount: 85000, status: 'active', date: '2025-12-27' },
  { id: '3', invoiceNo: 'INV-2025-003', customer: 'Cloud Services Inc', irn: null, amount: 220000, status: 'pending', date: '2025-12-26' },
  { id: '4', invoiceNo: 'INV-2025-004', customer: 'Marketing Agency', irn: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2', amount: 45000, status: 'cancelled', date: '2025-12-25' },
  { id: '5', invoiceNo: 'INV-2025-005', customer: 'Retail Partners', irn: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0a1b2c3', amount: 180000, status: 'active', date: '2025-12-24' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Active' };
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pending' };
    case 'cancelled':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Cancelled' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock, label: status };
  }
};

export default function EInvoiceScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredInvoices = einvoices.filter(inv =>
    inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">E-Invoice</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">IRN Generation</Text>
            </View>
          </View>
          <TouchableOpacity className="p-2 rounded-full bg-primary">
            <Plus size={18} className="text-white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3">
          <Search size={18} className="text-gray-400" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search invoices..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 py-3 px-2 text-gray-900 dark:text-white"
          />
          <TouchableOpacity className="p-2">
            <Filter size={18} className="text-gray-400" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          className="m-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-5"
        >
          <View className="flex-row items-center mb-3">
            <FileText size={24} className="text-white mr-2" />
            <Text className="text-lg font-bold text-white">E-Invoice Summary</Text>
          </View>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-white">{einvoiceSummary.totalGenerated}</Text>
              <Text className="text-white/80 text-xs">Total</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-300">{einvoiceSummary.successful}</Text>
              <Text className="text-white/80 text-xs">Active</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-yellow-300">{einvoiceSummary.pending}</Text>
              <Text className="text-white/80 text-xs">Pending</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-red-300">{einvoiceSummary.cancelled}</Text>
              <Text className="text-white/80 text-xs">Cancelled</Text>
            </View>
          </View>
        </Animated.View>

        {/* E-Invoices List */}
        <View className="px-4 mb-6">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(200)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            Recent E-Invoices
          </Animated.Text>

          {filteredInvoices.map((invoice, index) => {
            const statusStyle = getStatusStyle(invoice.status);
            const StatusIcon = statusStyle.icon;
            return (
              <Animated.View
                key={invoice.id}
                entering={FadeInUp.duration(400).delay(250 + index * 50)}
              >
                <TouchableOpacity
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">{invoice.invoiceNo}</Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400">{invoice.customer}</Text>
                    </View>
                    <View className={`flex-row items-center px-2 py-1 rounded-full ${statusStyle.bg}`}>
                      <StatusIcon size={12} className={statusStyle.text} />
                      <Text className={`text-xs font-medium ml-1 ${statusStyle.text}`}>{statusStyle.label}</Text>
                    </View>
                  </View>

                  {invoice.irn && (
                    <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center">
                          <QrCode size={14} className="text-primary mr-1.5" />
                          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">IRN</Text>
                        </View>
                        <TouchableOpacity className="p-1">
                          <Copy size={14} className="text-primary" />
                        </TouchableOpacity>
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 font-mono" numberOfLines={1}>
                        {invoice.irn}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Amount</Text>
                      <Text className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.amount)}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Date</Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      {invoice.status === 'pending' ? (
                        <TouchableOpacity className="px-3 py-1.5 rounded-lg bg-primary">
                          <Text className="text-xs font-medium text-white">Generate IRN</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <Download size={16} className="text-gray-600 dark:text-gray-400" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Generate Button */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(500)}
          className="mx-4 mb-8"
        >
          <TouchableOpacity className="flex-row items-center justify-center bg-primary rounded-xl py-4 active:opacity-80">
            <Plus size={20} className="text-white mr-2" />
            <Text className="text-white font-semibold text-base">Generate New E-Invoice</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
