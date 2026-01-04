import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route?: string;
  action?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const { user, tenant, logout } = useAuthStore();

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

  const menuSections: MenuSection[] = [
    {
      title: 'Business',
      items: [
        {
          id: 'customers',
          title: 'Customers',
          subtitle: 'Manage your customers',
          icon: 'people',
          iconColor: '#4F46E5',
          iconBg: 'bg-primary-50',
          route: '/customers',
        },
        {
          id: 'vendors',
          title: 'Vendors',
          subtitle: 'Manage your suppliers',
          icon: 'business',
          iconColor: '#D97706',
          iconBg: 'bg-warning-50',
          route: '/vendors',
        },
        {
          id: 'products',
          title: 'Products & Services',
          subtitle: 'Manage your inventory',
          icon: 'cube',
          iconColor: '#10B981',
          iconBg: 'bg-success-50',
          route: '/products',
        },
        {
          id: 'bills',
          title: 'Bills',
          subtitle: 'Track vendor bills',
          icon: 'receipt',
          iconColor: '#8B5CF6',
          iconBg: 'bg-purple-50',
          route: '/bills',
        },
        {
          id: 'expenses',
          title: 'Expenses',
          subtitle: 'Track business expenses',
          icon: 'trending-down',
          iconColor: '#EF4444',
          iconBg: 'bg-error-50',
          route: '/expenses',
        },
      ],
    },
    {
      title: 'Tax & Compliance',
      items: [
        {
          id: 'tax',
          title: 'Tax & GST',
          subtitle: 'GST returns and compliance',
          icon: 'calculator',
          iconColor: '#4F46E5',
          iconBg: 'bg-primary-50',
          route: '/tax',
        },
        {
          id: 'gstr1',
          title: 'GSTR-1',
          subtitle: 'Outward supplies return',
          icon: 'document-text',
          iconColor: '#10B981',
          iconBg: 'bg-success-50',
          route: '/tax/gstr1',
        },
        {
          id: 'gstr3b',
          title: 'GSTR-3B',
          subtitle: 'Monthly summary return',
          icon: 'document',
          iconColor: '#8B5CF6',
          iconBg: 'bg-purple-50',
          route: '/tax/gstr3b',
        },
        {
          id: 'tds',
          title: 'TDS',
          subtitle: 'Tax deducted at source',
          icon: 'shield-checkmark',
          iconColor: '#D97706',
          iconBg: 'bg-warning-50',
          route: '/tax/tds',
        },
        {
          id: 'einvoice',
          title: 'E-Invoice',
          subtitle: 'Generate IRN',
          icon: 'qr-code',
          iconColor: '#06B6D4',
          iconBg: 'bg-cyan-50',
          route: '/tax/einvoice',
        },
      ],
    },
    {
      title: 'Reports',
      items: [
        {
          id: 'profit-loss',
          title: 'Profit & Loss',
          subtitle: 'View income and expenses',
          icon: 'trending-up',
          iconColor: '#10B981',
          iconBg: 'bg-success-50',
          route: '/reports/profit-loss',
        },
        {
          id: 'balance-sheet',
          title: 'Balance Sheet',
          subtitle: 'Assets and liabilities',
          icon: 'bar-chart',
          iconColor: '#4F46E5',
          iconBg: 'bg-primary-50',
          route: '/reports/balance-sheet',
        },
        {
          id: 'gst-report',
          title: 'GST Report',
          subtitle: 'GSTR-1, GSTR-3B summaries',
          icon: 'document-text',
          iconColor: '#D97706',
          iconBg: 'bg-warning-50',
          route: '/reports/gst',
        },
        {
          id: 'aging-report',
          title: 'Aging Report',
          subtitle: 'Outstanding receivables/payables',
          icon: 'time',
          iconColor: '#EF4444',
          iconBg: 'bg-error-50',
          route: '/reports/aging',
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'business-profile',
          title: 'Business Profile',
          subtitle: 'Edit business details, GST info',
          icon: 'storefront',
          iconColor: '#4F46E5',
          iconBg: 'bg-primary-50',
          route: '/settings/business',
        },
        {
          id: 'invoice-settings',
          title: 'Invoice Settings',
          subtitle: 'Customize invoice templates',
          icon: 'document',
          iconColor: '#10B981',
          iconBg: 'bg-success-50',
          route: '/settings/invoice',
        },
        {
          id: 'bank-accounts',
          title: 'Bank Accounts',
          subtitle: 'Manage linked accounts',
          icon: 'wallet',
          iconColor: '#D97706',
          iconBg: 'bg-warning-50',
          route: '/settings/bank-accounts',
        },
        {
          id: 'notifications',
          title: 'Notifications',
          subtitle: 'Manage alerts and reminders',
          icon: 'notifications',
          iconColor: '#6B7280',
          iconBg: 'bg-gray-100',
          route: '/settings/notifications',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'My Profile',
          subtitle: user?.email || user?.phone || '',
          icon: 'person',
          iconColor: '#4F46E5',
          iconBg: 'bg-primary-50',
          route: '/settings/profile',
        },
        {
          id: 'help',
          title: 'Help & Support',
          subtitle: 'FAQs and contact us',
          icon: 'help-circle',
          iconColor: '#10B981',
          iconBg: 'bg-success-50',
          route: '/help',
        },
        {
          id: 'logout',
          title: 'Logout',
          icon: 'log-out',
          iconColor: '#EF4444',
          iconBg: 'bg-error-50',
          action: handleLogout,
        },
      ],
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => {
        if (item.action) {
          item.action();
        } else if (item.route) {
          router.push(item.route as any);
        }
      }}
      className="flex-row items-center py-4 border-b border-gray-100"
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${item.iconBg}`}>
        <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-gray-900 font-medium">{item.title}</Text>
        {item.subtitle && (
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header with User Info */}
      <View className="bg-primary-600 pt-12 pb-6 px-4">
        <View className="flex-row items-center">
          <View className="w-16 h-16 bg-white rounded-full items-center justify-center">
            <Text className="text-primary-600 text-2xl font-bold">
              {user?.first_name?.[0] || 'U'}
            </Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-white text-xl font-semibold">
              {user?.first_name} {user?.last_name}
            </Text>
            <Text className="text-primary-200">{tenant?.name}</Text>
          </View>
          <TouchableOpacity className="p-2">
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View className="bg-white mx-4 -mt-4 rounded-xl shadow-sm p-4 mb-4">
        <View className="flex-row">
          <View className="flex-1 items-center border-r border-gray-100">
            <Text className="text-gray-500 text-sm">This Month</Text>
            <Text className="text-gray-900 font-bold text-lg">₹0</Text>
            <Text className="text-gray-400 text-xs">Revenue</Text>
          </View>
          <View className="flex-1 items-center border-r border-gray-100">
            <Text className="text-gray-500 text-sm">Pending</Text>
            <Text className="text-warning-600 font-bold text-lg">0</Text>
            <Text className="text-gray-400 text-xs">Invoices</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-gray-500 text-sm">Overdue</Text>
            <Text className="text-error-600 font-bold text-lg">₹0</Text>
            <Text className="text-gray-400 text-xs">Amount</Text>
          </View>
        </View>
      </View>

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <View key={section.title} className="bg-white mx-4 rounded-xl shadow-sm mb-4 px-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide pt-4 pb-2">
            {section.title}
          </Text>
          {section.items.map(renderMenuItem)}
        </View>
      ))}

      {/* App Version */}
      <View className="items-center py-6">
        <Text className="text-gray-400 text-sm">BookKeep v1.0.0</Text>
        <Text className="text-gray-300 text-xs mt-1">Made with ❤️ in India</Text>
      </View>
    </ScrollView>
  );
}
