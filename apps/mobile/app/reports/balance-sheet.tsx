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
import { format, endOfMonth, subMonths } from 'date-fns';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { ChipSelect } from '../../src/components/ui/Select';
import { LoadingState } from '../../src/components/ui/LoadingState';

type PeriodType = 'current' | 'last_month' | 'last_quarter' | 'last_fy';

export default function BalanceSheetScreen() {
  const [period, setPeriod] = useState<PeriodType>('current');

  const getAsOfDate = () => {
    const now = new Date();
    switch (period) {
      case 'current':
        return format(now, 'yyyy-MM-dd');
      case 'last_month':
        return format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
      case 'last_quarter':
        const quarterEnd = new Date(
          now.getFullYear(),
          Math.floor((now.getMonth() - 1) / 3) * 3 + 2,
          0
        );
        return format(quarterEnd, 'yyyy-MM-dd');
      case 'last_fy':
        // Indian Financial Year ends March 31
        const fyEnd = now.getMonth() >= 3
          ? new Date(now.getFullYear(), 2, 31)
          : new Date(now.getFullYear() - 1, 2, 31);
        return format(fyEnd, 'yyyy-MM-dd');
      default:
        return format(now, 'yyyy-MM-dd');
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['balance-sheet', period],
    queryFn: async () => {
      const response = await api.reports.getBalanceSheet({ as_of: getAsOfDate() });
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
    { label: 'Current', value: 'current' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Last Quarter', value: 'last_quarter' },
    { label: 'Last FY', value: 'last_fy' },
  ];

  const renderAccountGroup = (
    title: string,
    groups: any[] | undefined,
    total: number,
    color: string
  ) => (
    <View className="px-4 mt-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-700 font-semibold">{title}</Text>
        <Text className={`font-bold ${color}`}>{formatCurrency(total)}</Text>
      </View>
      <Card>
        {groups?.map((group: any, index: number) => (
          <View
            key={group.name}
            className={`${index < groups.length - 1 ? 'border-b border-gray-100' : ''}`}
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
                <Text className="text-gray-700">{formatCurrency(account.balance)}</Text>
              </View>
            ))}
          </View>
        )) || (
          <Text className="text-gray-400 text-center py-4">No data available</Text>
        )}
      </Card>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">Balance Sheet</Text>
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
          {/* As Of Date */}
          <View className="items-center py-4">
            <Text className="text-gray-500 text-sm">
              As of {format(new Date(getAsOfDate()), 'd MMMM yyyy')}
            </Text>
          </View>

          {/* Summary Card */}
          <Card variant="elevated" className="mx-4 shadow-lg">
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-xs mb-1">Total Assets</Text>
                <Text className="text-success-600 font-bold text-lg">
                  {formatCurrency(data?.total_assets || 0)}
                </Text>
              </View>
              <View className="w-px bg-gray-200" />
              <View className="flex-1 items-center">
                <Text className="text-gray-500 text-xs mb-1">Total Liabilities</Text>
                <Text className="text-error-600 font-bold text-lg">
                  {formatCurrency(data?.total_liabilities || 0)}
                </Text>
              </View>
            </View>
            <View className="border-t border-gray-100 pt-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 font-medium">Net Worth / Equity</Text>
                <Text className="text-primary-600 font-bold text-xl">
                  {formatCurrency(data?.total_equity || 0)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Assets */}
          {renderAccountGroup(
            'Assets',
            data?.assets,
            data?.total_assets || 0,
            'text-success-600'
          )}

          {/* Liabilities */}
          {renderAccountGroup(
            'Liabilities',
            data?.liabilities,
            data?.total_liabilities || 0,
            'text-error-600'
          )}

          {/* Equity */}
          <View className="px-4 mt-6 mb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-700 font-semibold">Equity</Text>
              <Text className="text-primary-600 font-bold">
                {formatCurrency(data?.total_equity || 0)}
              </Text>
            </View>
            <Card>
              {data?.equity?.map((item: any, index: number) => (
                <View
                  key={item.name}
                  className={`flex-row items-center justify-between py-3 ${
                    index < (data.equity?.length || 0) - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <Text className="text-gray-700">{item.name}</Text>
                  <Text className="text-gray-900 font-medium">
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              )) || (
                <View className="py-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-700">Owner's Equity</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.total_equity || 0)}
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          </View>

          {/* Verification */}
          <View className="mx-4 mb-8">
            <Card className="bg-gray-100">
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    Math.abs(
                      (data?.total_assets || 0) -
                        (data?.total_liabilities || 0) -
                        (data?.total_equity || 0)
                    ) < 1
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={20}
                  color={
                    Math.abs(
                      (data?.total_assets || 0) -
                        (data?.total_liabilities || 0) -
                        (data?.total_equity || 0)
                    ) < 1
                      ? '#10B981'
                      : '#EF4444'
                  }
                />
                <Text className="text-gray-600 text-sm ml-2">
                  {Math.abs(
                    (data?.total_assets || 0) -
                      (data?.total_liabilities || 0) -
                      (data?.total_equity || 0)
                  ) < 1
                    ? 'Balance sheet is balanced'
                    : 'Balance sheet has a discrepancy'}
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
