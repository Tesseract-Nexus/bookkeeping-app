import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { ChipSelect } from '../../src/components/ui/Select';
import { LoadingState } from '../../src/components/ui/LoadingState';

type PeriodType = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

export default function ProfitLossScreen() {
  const [period, setPeriod] = useState<PeriodType>('this_month');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'this_month':
        return {
          start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return {
          start_date: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        };
      case 'this_quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        return {
          start_date: format(quarterStart, 'yyyy-MM-dd'),
          end_date: format(quarterEnd, 'yyyy-MM-dd'),
        };
      case 'this_year':
        // Indian Financial Year (April - March)
        const fyStart = now.getMonth() >= 3
          ? new Date(now.getFullYear(), 3, 1)
          : new Date(now.getFullYear() - 1, 3, 1);
        const fyEnd = now.getMonth() >= 3
          ? new Date(now.getFullYear() + 1, 2, 31)
          : new Date(now.getFullYear(), 2, 31);
        return {
          start_date: format(fyStart, 'yyyy-MM-dd'),
          end_date: format(fyEnd, 'yyyy-MM-dd'),
        };
      default:
        return {
          start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['profit-loss', period],
    queryFn: async () => {
      const dateRange = getDateRange();
      const response = await api.reports.getProfitLoss(dateRange);
      return response.data;
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const periodOptions = [
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'This Quarter', value: 'this_quarter' },
    { label: 'This FY', value: 'this_year' },
  ];

  const netProfit = (data?.total_income || 0) - (data?.total_expenses || 0);
  const isProfit = netProfit >= 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">Profit & Loss</Text>
          <TouchableOpacity className="p-2">
            <Ionicons name="download-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <ChipSelect
          options={periodOptions}
          value={period}
          onChange={(value) => setPeriod(value as PeriodType)}
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {/* Summary Card */}
          <Card variant="elevated" className="mx-4 mt-4 shadow-lg">
            <View className="items-center py-4">
              <Text className="text-gray-500 text-sm">
                {isProfit ? 'Net Profit' : 'Net Loss'}
              </Text>
              <Text
                className={`text-3xl font-bold mt-1 ${
                  isProfit ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {formatCurrency(Math.abs(netProfit))}
              </Text>
              <View className="flex-row items-center mt-3 gap-6">
                <View className="items-center">
                  <Text className="text-gray-400 text-xs">Income</Text>
                  <Text className="text-success-600 font-semibold">
                    {formatCurrency(data?.total_income || 0)}
                  </Text>
                </View>
                <View className="w-px h-8 bg-gray-200" />
                <View className="items-center">
                  <Text className="text-gray-400 text-xs">Expenses</Text>
                  <Text className="text-error-600 font-semibold">
                    {formatCurrency(data?.total_expenses || 0)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Income Section */}
          <View className="px-4 mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-700 font-semibold">Income</Text>
              <Text className="text-success-600 font-bold">
                {formatCurrency(data?.total_income || 0)}
              </Text>
            </View>
            <Card>
              {data?.income_groups?.map((group: any, index: number) => (
                <View
                  key={group.name}
                  className={`${
                    index < data.income_groups.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between py-3">
                    <Text className="text-gray-700 font-medium">{group.name}</Text>
                    <Text className="text-gray-900 font-semibold">
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                  {group.accounts?.map((account: any) => (
                    <View
                      key={account.id}
                      className="flex-row items-center justify-between py-2 pl-4"
                    >
                      <Text className="text-gray-500 text-sm">{account.name}</Text>
                      <Text className="text-gray-700">{formatCurrency(account.amount)}</Text>
                    </View>
                  ))}
                </View>
              )) || (
                <Text className="text-gray-400 text-center py-4">No income recorded</Text>
              )}
            </Card>
          </View>

          {/* Expenses Section */}
          <View className="px-4 mt-6 mb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-700 font-semibold">Expenses</Text>
              <Text className="text-error-600 font-bold">
                {formatCurrency(data?.total_expenses || 0)}
              </Text>
            </View>
            <Card>
              {data?.expense_groups?.map((group: any, index: number) => (
                <View
                  key={group.name}
                  className={`${
                    index < data.expense_groups.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <View className="flex-row items-center justify-between py-3">
                    <Text className="text-gray-700 font-medium">{group.name}</Text>
                    <Text className="text-gray-900 font-semibold">
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                  {group.accounts?.map((account: any) => (
                    <View
                      key={account.id}
                      className="flex-row items-center justify-between py-2 pl-4"
                    >
                      <Text className="text-gray-500 text-sm">{account.name}</Text>
                      <Text className="text-gray-700">{formatCurrency(account.amount)}</Text>
                    </View>
                  ))}
                </View>
              )) || (
                <Text className="text-gray-400 text-center py-4">No expenses recorded</Text>
              )}
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
