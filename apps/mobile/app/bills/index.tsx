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
  FileText,
  Building,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  MoreVertical,
  Download,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

interface Bill {
  id: string;
  billNumber: string;
  vendor: string;
  billDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
}

const sampleBills: Bill[] = [
  { id: '1', billNumber: 'BILL-2025-001', vendor: 'Tech Solutions Pvt Ltd', billDate: '2025-12-28', dueDate: '2026-01-28', amount: 150000, paidAmount: 0, status: 'pending' },
  { id: '2', billNumber: 'BILL-2025-002', vendor: 'Office Supplies Co', billDate: '2025-12-27', dueDate: '2026-01-27', amount: 45000, paidAmount: 45000, status: 'paid' },
  { id: '3', billNumber: 'BILL-2025-003', vendor: 'Cloud Services India', billDate: '2025-12-20', dueDate: '2025-12-30', amount: 220000, paidAmount: 100000, status: 'partial' },
  { id: '4', billNumber: 'BILL-2025-004', vendor: 'Marketing Agency', billDate: '2025-12-15', dueDate: '2025-12-25', amount: 85000, paidAmount: 0, status: 'overdue' },
  { id: '5', billNumber: 'BILL-2025-005', vendor: 'Logistics Partner', billDate: '2025-12-10', dueDate: '2026-01-10', amount: 125000, paidAmount: 125000, status: 'paid' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'paid':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Paid' };
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Pending' };
    case 'overdue':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'Overdue' };
    case 'partial':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: CreditCard, label: 'Partial' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock, label: status };
  }
};

export default function BillsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredBills = sampleBills.filter(bill =>
    bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = sampleBills.reduce((sum, b) => sum + b.amount, 0);
  const paidAmount = sampleBills.reduce((sum, b) => sum + b.paidAmount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueCount = sampleBills.filter(b => b.status === 'overdue').length;

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
              <Text className="text-xl font-bold text-gray-900 dark:text-white">Bills</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">{sampleBills.length} bills</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/bills/new')}
            className="p-2 rounded-full bg-primary"
          >
            <Plus size={20} className="text-white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3">
          <Search size={18} className="text-gray-400" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bills..."
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
        {/* Summary Cards */}
        <View className="p-4">
          <View className="flex-row gap-3 mb-3">
            <Animated.View
              entering={FadeInUp.duration(400).delay(100)}
              className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center mb-2">
                <FileText size={16} className="text-blue-600 mr-2" />
                <Text className="text-xs text-gray-500 dark:text-gray-400">Total Bills</Text>
              </View>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.duration(400).delay(150)}
              className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700"
            >
              <View className="flex-row items-center mb-2">
                <CheckCircle size={16} className="text-green-600 mr-2" />
                <Text className="text-xs text-green-700 dark:text-green-400">Paid</Text>
              </View>
              <Text className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(paidAmount)}</Text>
            </Animated.View>
          </View>
          <View className="flex-row gap-3">
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              className="flex-1 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700"
            >
              <View className="flex-row items-center mb-2">
                <Clock size={16} className="text-orange-600 mr-2" />
                <Text className="text-xs text-orange-700 dark:text-orange-400">Pending</Text>
              </View>
              <Text className="text-lg font-bold text-orange-700 dark:text-orange-400">{formatCurrency(pendingAmount)}</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.duration(400).delay(250)}
              className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-700"
            >
              <View className="flex-row items-center mb-2">
                <AlertTriangle size={16} className="text-red-600 mr-2" />
                <Text className="text-xs text-red-700 dark:text-red-400">Overdue</Text>
              </View>
              <Text className="text-lg font-bold text-red-700 dark:text-red-400">{overdueCount} bills</Text>
            </Animated.View>
          </View>
        </View>

        {/* Bills List */}
        <View className="px-4 pb-6">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(300)}
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3"
          >
            All Bills
          </Animated.Text>

          {filteredBills.map((bill, index) => {
            const statusStyle = getStatusStyle(bill.status);
            const StatusIcon = statusStyle.icon;
            const balance = bill.amount - bill.paidAmount;

            return (
              <Animated.View
                key={bill.id}
                entering={FadeInUp.duration(400).delay(350 + index * 50)}
              >
                <TouchableOpacity
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                        <FileText size={18} className="text-primary" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">{bill.billNumber}</Text>
                        <View className="flex-row items-center mt-0.5">
                          <Building size={12} className="text-gray-400 mr-1" />
                          <Text className="text-sm text-gray-500 dark:text-gray-400">{bill.vendor}</Text>
                        </View>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <View className={`flex-row items-center px-2 py-1 rounded-full ${statusStyle.bg}`}>
                        <StatusIcon size={12} className={statusStyle.text} />
                        <Text className={`text-xs font-medium ml-1 ${statusStyle.text}`}>{statusStyle.label}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Bill Amount</Text>
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(bill.amount)}</Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Balance</Text>
                      <Text className={`text-sm font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(balance)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Due Date</Text>
                      <Text className={`text-sm ${bill.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                        {new Date(bill.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                    <View className="flex-row gap-1">
                      <TouchableOpacity className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <Eye size={16} className="text-gray-600 dark:text-gray-400" />
                      </TouchableOpacity>
                      {bill.status !== 'paid' && (
                        <TouchableOpacity className="px-3 py-1.5 rounded-lg bg-primary">
                          <Text className="text-xs font-medium text-white">Pay</Text>
                        </TouchableOpacity>
                      )}
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
        entering={FadeInUp.duration(400).delay(600)}
        className="absolute bottom-6 right-6"
      >
        <TouchableOpacity
          onPress={() => router.push('/bills/new')}
          className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Plus size={24} className="text-white" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
