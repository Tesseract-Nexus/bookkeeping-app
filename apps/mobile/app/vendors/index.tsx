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
  Building,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  FileText,
  IndianRupee,
  Clock,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

interface Vendor {
  id: string;
  name: string;
  gstin?: string;
  phone: string;
  email: string;
  address: string;
  totalPurchases: number;
  outstandingBalance: number;
  status: 'active' | 'inactive';
  lastTransaction?: string;
}

const sampleVendors: Vendor[] = [
  { id: '1', name: 'Tech Solutions Pvt Ltd', gstin: '27AABCT1234P1ZP', phone: '+91 98765 43210', email: 'contact@techsolutions.com', address: 'Mumbai, Maharashtra', totalPurchases: 850000, outstandingBalance: 125000, status: 'active', lastTransaction: '2025-12-28' },
  { id: '2', name: 'Office Supplies Co', gstin: '27AABCO5678Q2ZQ', phone: '+91 98765 43211', email: 'sales@officesupplies.com', address: 'Delhi, NCR', totalPurchases: 320000, outstandingBalance: 45000, status: 'active', lastTransaction: '2025-12-27' },
  { id: '3', name: 'Cloud Services India', gstin: '29AABCC9012R3ZR', phone: '+91 98765 43212', email: 'support@cloudservices.in', address: 'Bangalore, Karnataka', totalPurchases: 1200000, outstandingBalance: 0, status: 'active', lastTransaction: '2025-12-25' },
  { id: '4', name: 'Marketing Agency', phone: '+91 98765 43213', email: 'hello@marketingagency.com', address: 'Pune, Maharashtra', totalPurchases: 180000, outstandingBalance: 35000, status: 'active', lastTransaction: '2025-12-20' },
  { id: '5', name: 'Logistics Partner', gstin: '27AABLP3456S4ZS', phone: '+91 98765 43214', email: 'ops@logistics.com', address: 'Chennai, Tamil Nadu', totalPurchases: 450000, outstandingBalance: 80000, status: 'inactive', lastTransaction: '2025-11-15' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function VendorsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredVendors = sampleVendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = sampleVendors.reduce((sum, v) => sum + v.outstandingBalance, 0);
  const activeVendors = sampleVendors.filter(v => v.status === 'active').length;

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
              <Text className="text-xl font-bold text-gray-900 dark:text-white">Vendors</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">{sampleVendors.length} vendors</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/vendors/new')}
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
            placeholder="Search vendors..."
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
        <View className="flex-row gap-3 p-4">
          <Animated.View
            entering={FadeInUp.duration(400).delay(100)}
            className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <View className="flex-row items-center mb-2">
              <Building size={16} className="text-primary mr-2" />
              <Text className="text-xs text-gray-500 dark:text-gray-400">Active Vendors</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">{activeVendors}</Text>
          </Animated.View>
          <Animated.View
            entering={FadeInUp.duration(400).delay(150)}
            className="flex-1 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700"
          >
            <View className="flex-row items-center mb-2">
              <IndianRupee size={16} className="text-orange-600 mr-2" />
              <Text className="text-xs text-orange-700 dark:text-orange-400">Outstanding</Text>
            </View>
            <Text className="text-lg font-bold text-orange-700 dark:text-orange-400">{formatCurrency(totalOutstanding)}</Text>
          </Animated.View>
        </View>

        {/* Vendors List */}
        <View className="px-4 pb-6">
          {filteredVendors.map((vendor, index) => (
            <Animated.View
              key={vendor.id}
              entering={FadeInUp.duration(400).delay(200 + index * 50)}
            >
              <TouchableOpacity
                className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mr-3">
                      <Building size={20} className="text-primary" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">{vendor.name}</Text>
                      {vendor.gstin && (
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">GSTIN: {vendor.gstin}</Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <View className={`px-2 py-1 rounded-full ${vendor.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs font-medium capitalize ${vendor.status === 'active' ? 'text-green-700' : 'text-gray-600'}`}>
                        {vendor.status}
                      </Text>
                    </View>
                    <TouchableOpacity className="p-1 ml-1">
                      <MoreVertical size={18} className="text-gray-400" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-y-2 mb-3">
                  <View className="flex-row items-center w-1/2">
                    <Phone size={12} className="text-gray-400 mr-1.5" />
                    <Text className="text-xs text-gray-600 dark:text-gray-400">{vendor.phone}</Text>
                  </View>
                  <View className="flex-row items-center w-1/2">
                    <Mail size={12} className="text-gray-400 mr-1.5" />
                    <Text className="text-xs text-gray-600 dark:text-gray-400" numberOfLines={1}>{vendor.email}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <MapPin size={12} className="text-gray-400 mr-1.5" />
                    <Text className="text-xs text-gray-600 dark:text-gray-400">{vendor.address}</Text>
                  </View>
                </View>

                <View className="flex-row justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Total Purchases</Text>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(vendor.totalPurchases)}</Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Outstanding</Text>
                    <Text className={`text-sm font-bold ${vendor.outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(vendor.outstandingBalance)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Last Txn</Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {vendor.lastTransaction ? new Date(vendor.lastTransaction).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(500)}
        className="absolute bottom-6 right-6"
      >
        <TouchableOpacity
          onPress={() => router.push('/vendors/new')}
          className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Plus size={24} className="text-white" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}
