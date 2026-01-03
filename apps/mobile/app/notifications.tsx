import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../src/lib/api';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button, IconButton } from '../src/components/ui/Button';
import { LoadingState } from '../src/components/ui/LoadingState';
import { EmptyState } from '../src/components/ui/EmptyState';

interface Notification {
  id: string;
  type: 'payment_reminder' | 'invoice_due' | 'payment_received' | 'team_invite' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  data?: {
    invoice_id?: string;
    customer_id?: string;
    transaction_id?: string;
  };
  created_at: string;
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.notifications.list();
      return response.data.notifications || [];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.notifications.markAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.notifications.markAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on type
    if (notification.data?.invoice_id) {
      router.push(`/invoices/${notification.data.invoice_id}`);
    } else if (notification.data?.customer_id) {
      router.push(`/customers/${notification.data.customer_id}`);
    } else if (notification.data?.transaction_id) {
      router.push(`/transactions/${notification.data.transaction_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, { name: string; color: string; bg: string }> = {
      payment_reminder: { name: 'alarm-outline', color: '#D97706', bg: 'bg-warning-50' },
      invoice_due: { name: 'document-text-outline', color: '#EF4444', bg: 'bg-error-50' },
      payment_received: { name: 'checkmark-circle-outline', color: '#10B981', bg: 'bg-success-50' },
      team_invite: { name: 'people-outline', color: '#4F46E5', bg: 'bg-primary-50' },
      system: { name: 'information-circle-outline', color: '#6B7280', bg: 'bg-gray-100' },
    };
    return icons[type] || icons.system;
  };

  const filteredNotifications = notifications?.filter((n: Notification) =>
    filter === 'unread' ? !n.is_read : true
  );

  const unreadCount = notifications?.filter((n: Notification) => !n.is_read).length || 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={() => markAllAsReadMutation.mutate()}>
              <Text className="text-primary-600 font-medium">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            onPress={() => setFilter('all')}
            className={`flex-1 py-2 rounded-md ${
              filter === 'all' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-center font-medium ${
                filter === 'all' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('unread')}
            className={`flex-1 py-2 rounded-md ${
              filter === 'unread' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <View className="flex-row items-center justify-center">
              <Text
                className={`text-center font-medium ${
                  filter === 'unread' ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                Unread
              </Text>
              {unreadCount > 0 && (
                <View className="ml-2 bg-primary-600 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : filteredNotifications?.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          message={
            filter === 'unread'
              ? "You're all caught up!"
              : 'Notifications about payments, invoices, and team activity will appear here'
          }
        />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          <View className="px-4 mt-4">
            {/* Today's Notifications */}
            {filteredNotifications?.some((n: Notification) => {
              const date = new Date(n.created_at);
              const today = new Date();
              return date.toDateString() === today.toDateString();
            }) && (
              <>
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
                  Today
                </Text>
                <Card padding="none" className="mb-4">
                  {filteredNotifications
                    ?.filter((n: Notification) => {
                      const date = new Date(n.created_at);
                      const today = new Date();
                      return date.toDateString() === today.toDateString();
                    })
                    .map((notification: Notification, index: number, arr: Notification[]) => {
                      const icon = getNotificationIcon(notification.type);
                      return (
                        <TouchableOpacity
                          key={notification.id}
                          onPress={() => handleNotificationPress(notification)}
                          className={`flex-row py-4 px-4 ${
                            index < arr.length - 1 ? 'border-b border-gray-100' : ''
                          } ${!notification.is_read ? 'bg-primary-50/30' : ''}`}
                        >
                          <View
                            className={`w-10 h-10 rounded-full items-center justify-center ${icon.bg}`}
                          >
                            <Ionicons
                              name={icon.name as any}
                              size={20}
                              color={icon.color}
                            />
                          </View>
                          <View className="flex-1 ml-3">
                            <View className="flex-row items-center">
                              <Text
                                className={`flex-1 ${
                                  notification.is_read
                                    ? 'text-gray-700'
                                    : 'text-gray-900 font-semibold'
                                }`}
                              >
                                {notification.title}
                              </Text>
                              {!notification.is_read && (
                                <View className="w-2 h-2 rounded-full bg-primary-600" />
                              )}
                            </View>
                            <Text className="text-gray-500 text-sm mt-1">
                              {notification.message}
                            </Text>
                            <Text className="text-gray-400 text-xs mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </Card>
              </>
            )}

            {/* Earlier Notifications */}
            {filteredNotifications?.some((n: Notification) => {
              const date = new Date(n.created_at);
              const today = new Date();
              return date.toDateString() !== today.toDateString();
            }) && (
              <>
                <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
                  Earlier
                </Text>
                <Card padding="none" className="mb-8">
                  {filteredNotifications
                    ?.filter((n: Notification) => {
                      const date = new Date(n.created_at);
                      const today = new Date();
                      return date.toDateString() !== today.toDateString();
                    })
                    .map((notification: Notification, index: number, arr: Notification[]) => {
                      const icon = getNotificationIcon(notification.type);
                      return (
                        <TouchableOpacity
                          key={notification.id}
                          onPress={() => handleNotificationPress(notification)}
                          className={`flex-row py-4 px-4 ${
                            index < arr.length - 1 ? 'border-b border-gray-100' : ''
                          } ${!notification.is_read ? 'bg-primary-50/30' : ''}`}
                        >
                          <View
                            className={`w-10 h-10 rounded-full items-center justify-center ${icon.bg}`}
                          >
                            <Ionicons
                              name={icon.name as any}
                              size={20}
                              color={icon.color}
                            />
                          </View>
                          <View className="flex-1 ml-3">
                            <View className="flex-row items-center">
                              <Text
                                className={`flex-1 ${
                                  notification.is_read
                                    ? 'text-gray-700'
                                    : 'text-gray-900 font-semibold'
                                }`}
                              >
                                {notification.title}
                              </Text>
                              {!notification.is_read && (
                                <View className="w-2 h-2 rounded-full bg-primary-600" />
                              )}
                            </View>
                            <Text className="text-gray-500 text-sm mt-1">
                              {notification.message}
                            </Text>
                            <Text className="text-gray-400 text-xs mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </Card>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
