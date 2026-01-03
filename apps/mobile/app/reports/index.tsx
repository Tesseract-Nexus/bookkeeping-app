import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Card, StatCard } from '../../src/components/ui/Card';
import { DashboardSkeleton } from '../../src/components/ui/LoadingState';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  route: string;
}

const reports: ReportItem[] = [
  {
    id: 'profit-loss',
    title: 'Profit & Loss',
    description: 'Income, expenses, and net profit',
    icon: 'trending-up',
    iconColor: '#10B981',
    iconBg: 'bg-success-50',
    route: '/reports/profit-loss',
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity',
    icon: 'bar-chart',
    iconColor: '#4F46E5',
    iconBg: 'bg-primary-50',
    route: '/reports/balance-sheet',
  },
  {
    id: 'cashflow',
    title: 'Cash Flow',
    description: 'Cash inflows and outflows',
    icon: 'swap-horizontal',
    iconColor: '#0EA5E9',
    iconBg: 'bg-blue-50',
    route: '/reports/cashflow',
  },
  {
    id: 'gstr1',
    title: 'GSTR-1',
    description: 'Outward supplies summary',
    icon: 'document-text',
    iconColor: '#D97706',
    iconBg: 'bg-warning-50',
    route: '/reports/gst?type=gstr1',
  },
  {
    id: 'gstr3b',
    title: 'GSTR-3B',
    description: 'Monthly tax summary',
    icon: 'calculator',
    iconColor: '#D97706',
    iconBg: 'bg-warning-50',
    route: '/reports/gst?type=gstr3b',
  },
  {
    id: 'receivables',
    title: 'Receivables Aging',
    description: 'Outstanding payments by age',
    icon: 'time',
    iconColor: '#10B981',
    iconBg: 'bg-success-50',
    route: '/reports/aging?type=receivables',
  },
  {
    id: 'payables',
    title: 'Payables Aging',
    description: 'Pending payments by age',
    icon: 'time',
    iconColor: '#EF4444',
    iconBg: 'bg-error-50',
    route: '/reports/aging?type=payables',
  },
  {
    id: 'daybook',
    title: 'Day Book',
    description: 'Daily transactions summary',
    icon: 'calendar',
    iconColor: '#6B7280',
    iconBg: 'bg-gray-100',
    route: '/reports/daybook',
  },
  {
    id: 'ledger',
    title: 'General Ledger',
    description: 'Account-wise transactions',
    icon: 'book',
    iconColor: '#4F46E5',
    iconBg: 'bg-primary-50',
    route: '/reports/ledger',
  },
];

export default function ReportsScreen() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.reports.getDashboard();
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Reports</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Quick Stats */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <StatCard
                  title="This Month Sales"
                  value={formatCurrency(dashboard?.this_month?.sales || 0)}
                  trend={
                    dashboard?.this_month?.sales_change_percent !== undefined
                      ? {
                          value: dashboard.this_month.sales_change_percent,
                          isPositive: dashboard.this_month.sales_change_percent >= 0,
                        }
                      : undefined
                  }
                  icon="trending-up"
                  iconColor="#10B981"
                  iconBgColor="bg-success-50"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-6">
              <View className="flex-1">
                <StatCard
                  title="Receivables"
                  value={formatCurrency(dashboard?.outstanding?.receivables || 0)}
                  icon="arrow-down"
                  iconColor="#10B981"
                  iconBgColor="bg-success-50"
                  onPress={() => router.push('/reports/aging?type=receivables')}
                />
              </View>
              <View className="flex-1">
                <StatCard
                  title="Payables"
                  value={formatCurrency(dashboard?.outstanding?.payables || 0)}
                  icon="arrow-up"
                  iconColor="#EF4444"
                  iconBgColor="bg-error-50"
                  onPress={() => router.push('/reports/aging?type=payables')}
                />
              </View>
            </View>
          </>
        )}

        {/* Reports Grid */}
        <Text className="text-gray-700 font-semibold mb-3">Financial Reports</Text>
        <View className="flex-row flex-wrap">
          {reports.slice(0, 3).map((report) => (
            <TouchableOpacity
              key={report.id}
              onPress={() => router.push(report.route)}
              className="w-1/3 p-2"
            >
              <Card className="items-center py-4">
                <View className={`w-12 h-12 rounded-full items-center justify-center ${report.iconBg}`}>
                  <Ionicons name={report.icon} size={24} color={report.iconColor} />
                </View>
                <Text className="text-gray-700 text-sm font-medium mt-2 text-center">
                  {report.title}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-gray-700 font-semibold mb-3 mt-4">GST Reports</Text>
        <View className="flex-row flex-wrap">
          {reports.slice(3, 5).map((report) => (
            <TouchableOpacity
              key={report.id}
              onPress={() => router.push(report.route)}
              className="w-1/2 p-2"
            >
              <Card className="flex-row items-center p-4">
                <View className={`w-10 h-10 rounded-full items-center justify-center ${report.iconBg}`}>
                  <Ionicons name={report.icon} size={20} color={report.iconColor} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-gray-700 font-medium">{report.title}</Text>
                  <Text className="text-gray-400 text-xs">{report.description}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-gray-700 font-semibold mb-3 mt-4">Other Reports</Text>
        <Card>
          {reports.slice(5).map((report, index) => (
            <TouchableOpacity
              key={report.id}
              onPress={() => router.push(report.route)}
              className={`flex-row items-center py-4 ${
                index < reports.length - 6 ? 'border-b border-gray-100' : ''
              }`}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center ${report.iconBg}`}>
                <Ionicons name={report.icon} size={20} color={report.iconColor} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-gray-700 font-medium">{report.title}</Text>
                <Text className="text-gray-400 text-sm">{report.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Export Options */}
        <Text className="text-gray-700 font-semibold mb-3 mt-6">Export Data</Text>
        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center border border-gray-200">
            <Ionicons name="document" size={24} color="#4F46E5" />
            <Text className="text-gray-700 text-sm font-medium mt-2">PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center border border-gray-200">
            <Ionicons name="grid" size={24} color="#10B981" />
            <Text className="text-gray-700 text-sm font-medium mt-2">Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-white rounded-xl p-4 items-center border border-gray-200">
            <Ionicons name="mail" size={24} color="#D97706" />
            <Text className="text-gray-700 text-sm font-medium mt-2">Email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
