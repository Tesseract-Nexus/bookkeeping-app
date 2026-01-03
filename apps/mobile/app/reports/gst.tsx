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
import { Badge } from '../../src/components/ui/Badge';
import { ChipSelect } from '../../src/components/ui/Select';
import { LoadingState } from '../../src/components/ui/LoadingState';

type PeriodType = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter';
type GSTType = 'gstr1' | 'gstr3b' | 'gstr2a';

export default function GSTScreen() {
  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [gstType, setGstType] = useState<GSTType>('gstr1');

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
      case 'last_quarter':
        const lastQStart = new Date(
          now.getFullYear(),
          Math.floor((now.getMonth() - 3) / 3) * 3,
          1
        );
        const lastQEnd = new Date(
          now.getFullYear(),
          Math.floor((now.getMonth() - 3) / 3) * 3 + 3,
          0
        );
        return {
          start_date: format(lastQStart, 'yyyy-MM-dd'),
          end_date: format(lastQEnd, 'yyyy-MM-dd'),
        };
      default:
        return {
          start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
        };
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gst-report', period, gstType],
    queryFn: async () => {
      const dateRange = getDateRange();
      const response = await api.reports.getGSTReport({ ...dateRange, type: gstType });
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
    { label: 'Last Quarter', value: 'last_quarter' },
  ];

  const gstTypeOptions = [
    { label: 'GSTR-1', value: 'gstr1' },
    { label: 'GSTR-3B', value: 'gstr3b' },
    { label: 'GSTR-2A', value: 'gstr2a' },
  ];

  const netPayable = (data?.output_tax || 0) - (data?.input_tax || 0);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">GST Report</Text>
          <TouchableOpacity className="p-2">
            <Ionicons name="download-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* GST Type Selector */}
        <View className="flex-row bg-gray-100 rounded-lg p-1 mb-4">
          {gstTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setGstType(option.value as GSTType)}
              className={`flex-1 py-2 rounded-md ${
                gstType === option.value ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  gstType === option.value ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
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
            <View className="items-center py-2">
              <Text className="text-gray-500 text-sm">
                {netPayable >= 0 ? 'GST Payable' : 'GST Credit'}
              </Text>
              <Text
                className={`text-3xl font-bold mt-1 ${
                  netPayable >= 0 ? 'text-error-600' : 'text-success-600'
                }`}
              >
                {formatCurrency(Math.abs(netPayable))}
              </Text>
              <View className="flex-row items-center mt-4 gap-6">
                <View className="items-center">
                  <Text className="text-gray-400 text-xs">Output Tax</Text>
                  <Text className="text-error-600 font-semibold">
                    {formatCurrency(data?.output_tax || 0)}
                  </Text>
                </View>
                <View className="w-px h-8 bg-gray-200" />
                <View className="items-center">
                  <Text className="text-gray-400 text-xs">Input Tax</Text>
                  <Text className="text-success-600 font-semibold">
                    {formatCurrency(data?.input_tax || 0)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* GSTR-1 Content */}
          {gstType === 'gstr1' && (
            <>
              {/* B2B Invoices */}
              <View className="px-4 mt-6">
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
                  B2B Invoices (Registered Dealers)
                </Text>
                <Card>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-gray-500">Number of Invoices</Text>
                    <Text className="text-gray-900 font-medium">
                      {data?.b2b?.invoice_count || 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">Taxable Value</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.b2b?.taxable_value || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">IGST</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.b2b?.igst || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">CGST</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.b2b?.cgst || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">SGST</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.b2b?.sgst || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100 bg-gray-50 -mx-4 px-4 rounded-b-xl">
                    <Text className="text-gray-700 font-medium">Total Tax</Text>
                    <Text className="text-primary-600 font-bold">
                      {formatCurrency(data?.b2b?.total_tax || 0)}
                    </Text>
                  </View>
                </Card>
              </View>

              {/* B2C Invoices */}
              <View className="px-4 mt-4">
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
                  B2C Invoices (Unregistered Dealers)
                </Text>
                <Card>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-gray-500">Taxable Value</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.b2c?.taxable_value || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">Total Tax</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.b2c?.total_tax || 0)}
                    </Text>
                  </View>
                </Card>
              </View>
            </>
          )}

          {/* GSTR-3B Content */}
          {gstType === 'gstr3b' && (
            <>
              {/* Outward Supplies */}
              <View className="px-4 mt-6">
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
                  3.1 Outward Supplies
                </Text>
                <Card>
                  {data?.outward_supplies?.map((item: any, index: number) => (
                    <View
                      key={item.type}
                      className={`py-3 ${
                        index < (data.outward_supplies?.length || 0) - 1
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                    >
                      <Text className="text-gray-700 font-medium">{item.type}</Text>
                      <View className="flex-row justify-between mt-2">
                        <Text className="text-gray-500 text-sm">Taxable Value</Text>
                        <Text className="text-gray-900">{formatCurrency(item.taxable_value)}</Text>
                      </View>
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-gray-500 text-sm">Tax Amount</Text>
                        <Text className="text-gray-900">{formatCurrency(item.tax_amount)}</Text>
                      </View>
                    </View>
                  )) || (
                    <Text className="text-gray-400 text-center py-4">No outward supplies</Text>
                  )}
                </Card>
              </View>

              {/* Input Tax Credit */}
              <View className="px-4 mt-4">
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
                  4. Input Tax Credit
                </Text>
                <Card>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-gray-500">IGST</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.itc?.igst || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">CGST</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.itc?.cgst || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">SGST</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.itc?.sgst || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">Cess</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.itc?.cess || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100 bg-gray-50 -mx-4 px-4 rounded-b-xl">
                    <Text className="text-gray-700 font-medium">Total ITC</Text>
                    <Text className="text-success-600 font-bold">
                      {formatCurrency(data?.itc?.total || 0)}
                    </Text>
                  </View>
                </Card>
              </View>
            </>
          )}

          {/* GSTR-2A Content */}
          {gstType === 'gstr2a' && (
            <View className="px-4 mt-6">
              <Card className="bg-warning-50">
                <View className="flex-row items-center">
                  <Ionicons name="information-circle" size={24} color="#D97706" />
                  <View className="ml-3 flex-1">
                    <Text className="text-warning-800 font-medium">GSTR-2A Data</Text>
                    <Text className="text-warning-700 text-sm mt-1">
                      GSTR-2A is auto-populated from your suppliers' GSTR-1. Connect with GST
                      portal to fetch the latest data.
                    </Text>
                  </View>
                </View>
              </Card>

              <View className="mt-4">
                <Card>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-gray-500">Eligible ITC</Text>
                    <Text className="text-success-600 font-medium">
                      {formatCurrency(data?.eligible_itc || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">Claimed ITC</Text>
                    <Text className="text-gray-900 font-medium">
                      {formatCurrency(data?.claimed_itc || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2 border-t border-gray-100">
                    <Text className="text-gray-500">Difference</Text>
                    <Text
                      className={`font-medium ${
                        (data?.eligible_itc || 0) - (data?.claimed_itc || 0) >= 0
                          ? 'text-success-600'
                          : 'text-error-600'
                      }`}
                    >
                      {formatCurrency((data?.eligible_itc || 0) - (data?.claimed_itc || 0))}
                    </Text>
                  </View>
                </Card>
              </View>
            </View>
          )}

          {/* Rate-wise Summary */}
          <View className="px-4 mt-6 mb-8">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
              Rate-wise Summary
            </Text>
            <Card padding="none">
              <View className="flex-row bg-gray-50 py-3 px-4 border-b border-gray-100">
                <Text className="flex-1 text-gray-500 text-xs font-semibold">GST Rate</Text>
                <Text className="flex-1 text-gray-500 text-xs font-semibold text-right">
                  Taxable
                </Text>
                <Text className="flex-1 text-gray-500 text-xs font-semibold text-right">Tax</Text>
              </View>
              {[
                { rate: '5%', taxable: data?.rate_wise?.['5']?.taxable || 0, tax: data?.rate_wise?.['5']?.tax || 0 },
                { rate: '12%', taxable: data?.rate_wise?.['12']?.taxable || 0, tax: data?.rate_wise?.['12']?.tax || 0 },
                { rate: '18%', taxable: data?.rate_wise?.['18']?.taxable || 0, tax: data?.rate_wise?.['18']?.tax || 0 },
                { rate: '28%', taxable: data?.rate_wise?.['28']?.taxable || 0, tax: data?.rate_wise?.['28']?.tax || 0 },
              ].map((item, index) => (
                <View
                  key={item.rate}
                  className={`flex-row py-3 px-4 ${index < 3 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-1">
                    <Badge variant="default" size="sm">
                      {item.rate}
                    </Badge>
                  </View>
                  <Text className="flex-1 text-gray-900 text-right">
                    {formatCurrency(item.taxable)}
                  </Text>
                  <Text className="flex-1 text-gray-900 text-right font-medium">
                    {formatCurrency(item.tax)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
