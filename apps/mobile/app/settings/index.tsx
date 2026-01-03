import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuthStore } from '../../src/stores/auth-store';
import { Card, ListCard } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';

export default function SettingsScreen() {
  const { user, tenant, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Handle account deletion
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Section */}
        <TouchableOpacity
          onPress={() => router.push('/settings/profile')}
          className="bg-white mx-4 mt-4 rounded-xl p-4 flex-row items-center"
        >
          <Avatar name={`${user?.first_name} ${user?.last_name}`} size="lg" />
          <View className="flex-1 ml-4">
            <Text className="text-gray-900 text-lg font-semibold">
              {user?.first_name} {user?.last_name}
            </Text>
            <Text className="text-gray-500">{user?.email || user?.phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Business Settings */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Business
          </Text>
          <Card padding="none">
            <ListCard
              title="Business Profile"
              subtitle="Edit business details, logo, GST info"
              leftIcon="storefront-outline"
              leftIconColor="#4F46E5"
              leftIconBgColor="bg-primary-50"
              onPress={() => router.push('/settings/business')}
            />
            <ListCard
              title="Invoice Settings"
              subtitle="Customize invoice templates"
              leftIcon="document-text-outline"
              leftIconColor="#10B981"
              leftIconBgColor="bg-success-50"
              onPress={() => router.push('/settings/invoice')}
            />
            <ListCard
              title="Tax Settings"
              subtitle="GST rates, HSN codes"
              leftIcon="calculator-outline"
              leftIconColor="#D97706"
              leftIconBgColor="bg-warning-50"
              onPress={() => router.push('/settings/tax')}
            />
            <ListCard
              title="Bank Accounts"
              subtitle="Manage linked accounts"
              leftIcon="wallet-outline"
              leftIconColor="#0EA5E9"
              leftIconBgColor="bg-blue-50"
              onPress={() => router.push('/settings/bank-accounts')}
              showChevron
            />
          </Card>
        </View>

        {/* Team */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Team
          </Text>
          <Card padding="none">
            <ListCard
              title="Team Members"
              subtitle="Manage staff access"
              leftIcon="people-outline"
              leftIconColor="#4F46E5"
              leftIconBgColor="bg-primary-50"
              onPress={() => router.push('/settings/team')}
            />
            <ListCard
              title="Roles & Permissions"
              subtitle="Configure access levels"
              leftIcon="shield-outline"
              leftIconColor="#6B7280"
              leftIconBgColor="bg-gray-100"
              onPress={() => router.push('/settings/roles')}
              showChevron
            />
          </Card>
        </View>

        {/* App Settings */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            App Settings
          </Text>
          <Card padding="none">
            <View className="flex-row items-center justify-between py-4 px-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-primary-50">
                  <Ionicons name="notifications-outline" size={20} color="#4F46E5" />
                </View>
                <View className="ml-3">
                  <Text className="text-gray-900 font-medium">Push Notifications</Text>
                  <Text className="text-gray-500 text-sm">Receive payment reminders</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#D1D5DB', true: '#4F46E5' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View className="flex-row items-center justify-between py-4 px-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-success-50">
                  <Ionicons name="finger-print-outline" size={20} color="#10B981" />
                </View>
                <View className="ml-3">
                  <Text className="text-gray-900 font-medium">Biometric Login</Text>
                  <Text className="text-gray-500 text-sm">Use Face ID / Fingerprint</Text>
                </View>
              </View>
              <Switch
                value={biometric}
                onValueChange={setBiometric}
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <ListCard
              title="Language"
              subtitle="English (India)"
              leftIcon="language-outline"
              leftIconColor="#6B7280"
              leftIconBgColor="bg-gray-100"
              onPress={() => router.push('/settings/language')}
            />
            <ListCard
              title="Currency"
              subtitle="Indian Rupee (₹)"
              leftIcon="cash-outline"
              leftIconColor="#6B7280"
              leftIconBgColor="bg-gray-100"
              onPress={() => router.push('/settings/currency')}
              showChevron
            />
          </Card>
        </View>

        {/* Data & Privacy */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Data & Privacy
          </Text>
          <Card padding="none">
            <ListCard
              title="Export Data"
              subtitle="Download all your data"
              leftIcon="download-outline"
              leftIconColor="#4F46E5"
              leftIconBgColor="bg-primary-50"
              onPress={() => router.push('/settings/export')}
            />
            <ListCard
              title="Backup"
              subtitle="Last backup: Today, 10:30 AM"
              leftIcon="cloud-upload-outline"
              leftIconColor="#10B981"
              leftIconBgColor="bg-success-50"
              onPress={() => router.push('/settings/backup')}
            />
            <ListCard
              title="Privacy Policy"
              leftIcon="document-outline"
              leftIconColor="#6B7280"
              leftIconBgColor="bg-gray-100"
              onPress={() => {}}
            />
            <ListCard
              title="Terms of Service"
              leftIcon="document-outline"
              leftIconColor="#6B7280"
              leftIconBgColor="bg-gray-100"
              onPress={() => {}}
              showChevron
            />
          </Card>
        </View>

        {/* Support */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Support
          </Text>
          <Card padding="none">
            <ListCard
              title="Help Center"
              subtitle="FAQs and guides"
              leftIcon="help-circle-outline"
              leftIconColor="#4F46E5"
              leftIconBgColor="bg-primary-50"
              onPress={() => {}}
            />
            <ListCard
              title="Contact Support"
              subtitle="Chat with our team"
              leftIcon="chatbubble-outline"
              leftIconColor="#10B981"
              leftIconBgColor="bg-success-50"
              onPress={() => {}}
            />
            <ListCard
              title="Rate the App"
              leftIcon="star-outline"
              leftIconColor="#D97706"
              leftIconBgColor="bg-warning-50"
              onPress={() => {}}
              showChevron
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View className="px-4 mt-6">
          <Card padding="none">
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center py-4 px-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-full items-center justify-center bg-gray-100">
                <Ionicons name="log-out-outline" size={20} color="#6B7280" />
              </View>
              <Text className="text-gray-700 font-medium ml-3">Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteAccount}
              className="flex-row items-center py-4 px-4"
            >
              <View className="w-10 h-10 rounded-full items-center justify-center bg-error-50">
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <Text className="text-error-600 font-medium ml-3">Delete Account</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Version */}
        <View className="items-center mt-8 mb-4">
          <Text className="text-gray-400 text-sm">BookKeep v1.0.0</Text>
          <Text className="text-gray-300 text-xs mt-1">Made with ❤️ in India</Text>
        </View>
      </ScrollView>
    </View>
  );
}
