import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Avatar } from '../../src/components/ui/Avatar';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { EmptyState } from '../../src/components/ui/EmptyState';

type AgingType = 'receivables' | 'payables';

interface AgingBucket {
  label: string;
  days: string;
  amount: number;
  count: number;
  percentage: number;
}

interface PartyAging {
  id: string;
  name: string;
  phone?: string;
  total_outstanding: number;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  oldest_invoice_date: string;
}

export default function AgingReportScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<AgingType>(
    (params.type as AgingType) || 'receivables'
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['aging-report', type],
    queryFn: async () => {
      const response = await api.reports.getAgingReport({ type });
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

  const getBucketColor = (index: number) => {
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#7C3AED'];
    return colors[index] || colors[0];
  };

  const buckets: AgingBucket[] = data?.buckets || [
    { label: 'Current', days: '0 days', amount: 0, count: 0, percentage: 0 },
    { label: '1-30 Days', days: '1-30', amount: 0, count: 0, percentage: 0 },
    { label: '31-60 Days', days: '31-60', amount: 0, count: 0, percentage: 0 },
    { label: '61-90 Days', days: '61-90', amount: 0, count: 0, percentage: 0 },
    { label: '90+ Days', days: '>90', amount: 0, count: 0, percentage: 0 },
  ];

  const parties: PartyAging[] = data?.parties || [];
  const totalOutstanding = data?.total_outstanding || 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">Aging Report</Text>
          <TouchableOpacity className="p-2">
            <Ionicons name="download-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Type Selector */}
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            onPress={() => setType('receivables')}
            className={`flex-1 py-2 rounded-md ${
              type === 'receivables' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-center font-medium ${
                type === 'receivables' ? 'text-success-600' : 'text-gray-500'
              }`}
            >
              Receivables
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType('payables')}
            className={`flex-1 py-2 rounded-md ${
              type === 'payables' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-center font-medium ${
                type === 'payables' ? 'text-error-600' : 'text-gray-500'
              }`}
            >
              Payables
            </Text>
          </TouchableOpacity>
        </View>
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
            <View className="items-center">
              <Text className="text-gray-500 text-sm">
                Total {type === 'receivables' ? 'Receivables' : 'Payables'}
              </Text>
              <Text
                className={`text-3xl font-bold mt-1 ${
                  type === 'receivables' ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {formatCurrency(totalOutstanding)}
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                from {parties.length} {type === 'receivables' ? 'customers' : 'vendors'}
              </Text>
            </View>

            {/* Aging Bar */}
            <View className="mt-6">
              <View className="flex-row h-4 rounded-full overflow-hidden bg-gray-200">
                {buckets.map((bucket, index) => (
                  <View
                    key={bucket.label}
                    style={{
                      flex: bucket.percentage || 0.1,
                      backgroundColor: getBucketColor(index),
                    }}
                  />
                ))}
              </View>
              <View className="flex-row flex-wrap justify-center mt-3 gap-x-4 gap-y-2">
                {buckets.map((bucket, index) => (
                  <View key={bucket.label} className="flex-row items-center">
                    <View
                      className="w-3 h-3 rounded-full mr-1"
                      style={{ backgroundColor: getBucketColor(index) }}
                    />
                    <Text className="text-gray-500 text-xs">{bucket.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>

          {/* Aging Buckets */}
          <View className="px-4 mt-6">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
              Aging Buckets
            </Text>
            <Card padding="none">
              {buckets.map((bucket, index) => (
                <View
                  key={bucket.label}
                  className={`flex-row items-center py-4 px-4 ${
                    index < buckets.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${getBucketColor(index)}20` }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: getBucketColor(index) }}
                    >
                      {bucket.days}
                    </Text>
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-gray-900 font-medium">{bucket.label}</Text>
                    <Text className="text-gray-500 text-sm">
                      {bucket.count} {type === 'receivables' ? 'invoices' : 'bills'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-900 font-semibold">
                      {formatCurrency(bucket.amount)}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      {bucket.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          {/* Party-wise Breakdown */}
          <View className="px-4 mt-6 mb-8">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
              {type === 'receivables' ? 'Customer' : 'Vendor'} Breakdown
            </Text>

            {parties.length === 0 ? (
              <EmptyState
                icon={type === 'receivables' ? 'arrow-down' : 'arrow-up'}
                title={`No ${type}`}
                message={`No outstanding ${type} found`}
              />
            ) : (
              <Card padding="none">
                {parties.map((party, index) => (
                  <TouchableOpacity
                    key={party.id}
                    onPress={() => router.push(`/customers/${party.id}`)}
                    className={`py-4 px-4 ${
                      index < parties.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Avatar name={party.name} size="md" />
                      <View className="flex-1 ml-3">
                        <Text className="text-gray-900 font-medium">{party.name}</Text>
                        <Text className="text-gray-500 text-sm">
                          Oldest: {format(new Date(party.oldest_invoice_date), 'd MMM yyyy')}
                        </Text>
                      </View>
                      <Text
                        className={`font-bold ${
                          type === 'receivables' ? 'text-success-600' : 'text-error-600'
                        }`}
                      >
                        {formatCurrency(party.total_outstanding)}
                      </Text>
                    </View>

                    {/* Party Aging Breakdown */}
                    <View className="flex-row mt-3 gap-2">
                      {party.current > 0 && (
                        <View className="bg-success-50 rounded px-2 py-1">
                          <Text className="text-success-700 text-xs">
                            Current: {formatCurrency(party.current)}
                          </Text>
                        </View>
                      )}
                      {party.days_1_30 > 0 && (
                        <View className="bg-blue-50 rounded px-2 py-1">
                          <Text className="text-blue-700 text-xs">
                            1-30d: {formatCurrency(party.days_1_30)}
                          </Text>
                        </View>
                      )}
                      {party.days_31_60 > 0 && (
                        <View className="bg-warning-50 rounded px-2 py-1">
                          <Text className="text-warning-700 text-xs">
                            31-60d: {formatCurrency(party.days_31_60)}
                          </Text>
                        </View>
                      )}
                      {party.days_61_90 > 0 && (
                        <View className="bg-orange-50 rounded px-2 py-1">
                          <Text className="text-orange-700 text-xs">
                            61-90d: {formatCurrency(party.days_61_90)}
                          </Text>
                        </View>
                      )}
                      {party.days_90_plus > 0 && (
                        <View className="bg-error-50 rounded px-2 py-1">
                          <Text className="text-error-700 text-xs">
                            90+d: {formatCurrency(party.days_90_plus)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>

          {/* Tips */}
          <View className="mx-4 mb-8">
            <Card className="bg-primary-50">
              <View className="flex-row">
                <Ionicons name="bulb-outline" size={24} color="#4F46E5" />
                <View className="ml-3 flex-1">
                  <Text className="text-primary-800 font-medium">Collection Tips</Text>
                  <Text className="text-primary-700 text-sm mt-1">
                    {type === 'receivables'
                      ? 'Focus on invoices aged 60+ days first. Send payment reminders and consider offering early payment discounts.'
                      : 'Prioritize payments to vendors with the longest outstanding to maintain good relationships.'}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
