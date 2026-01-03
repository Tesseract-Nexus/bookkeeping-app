import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { Button, IconButton } from '../../src/components/ui/Button';
import { StatusBadge } from '../../src/components/ui/Badge';
import { ActionSheet } from '../../src/components/ui/BottomSheet';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { ErrorState } from '../../src/components/ui/EmptyState';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const { data: invoice, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const response = await api.invoices.get(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => api.invoices.send(id!, { email: invoice?.party?.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      Alert.alert('Success', 'Invoice sent successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to send invoice');
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => api.invoices.void(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      Alert.alert('Success', 'Invoice voided successfully');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Invoice ${invoice?.invoice_number}\nAmount: ${formatCurrency(invoice?.total_amount || 0)}\nDue: ${format(new Date(invoice?.due_date), 'dd MMM yyyy')}`,
        title: `Invoice ${invoice?.invoice_number}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleVoid = () => {
    Alert.alert(
      'Void Invoice',
      'Are you sure you want to void this invoice? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Void', style: 'destructive', onPress: () => voidMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return <LoadingState variant="fullscreen" />;
  }

  if (error || !invoice) {
    return <ErrorState onRetry={refetch} />;
  }

  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue' ||
    (invoice.status !== 'paid' && new Date(invoice.due_date) < new Date());

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">
              {invoice.invoice_number}
            </Text>
            <StatusBadge status={invoice.status} size="sm" />
          </View>
          <IconButton
            icon="share-outline"
            variant="secondary"
            onPress={handleShare}
            className="mr-2"
          />
          <IconButton
            icon="ellipsis-vertical"
            variant="secondary"
            onPress={() => setShowActions(true)}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Amount Card */}
        <Card variant="elevated" className="mx-4 mt-4 shadow-lg">
          <View className="items-center py-4">
            <Text className="text-gray-500 text-sm">Total Amount</Text>
            <Text className="text-3xl font-bold text-gray-900 mt-1">
              {formatCurrency(invoice.total_amount)}
            </Text>
            {!isPaid && invoice.balance_due > 0 && (
              <View className="mt-2 bg-warning-50 px-3 py-1 rounded-full">
                <Text className="text-warning-700 text-sm font-medium">
                  Balance Due: {formatCurrency(invoice.balance_due)}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Details */}
        <View className="px-4 mt-6">
          <Text className="text-gray-700 font-semibold mb-3">Invoice Details</Text>
          <Card>
            <View className="flex-row items-center py-3 border-b border-gray-100">
              <Text className="text-gray-500 w-28">Customer</Text>
              <TouchableOpacity
                onPress={() => router.push(`/customers/${invoice.party_id}`)}
                className="flex-1 flex-row items-center"
              >
                <Text className="text-primary-600 font-medium flex-1">
                  {invoice.party_name}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center py-3 border-b border-gray-100">
              <Text className="text-gray-500 w-28">Invoice Date</Text>
              <Text className="text-gray-900 flex-1">
                {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
              </Text>
            </View>
            <View className="flex-row items-center py-3 border-b border-gray-100">
              <Text className="text-gray-500 w-28">Due Date</Text>
              <Text className={`flex-1 font-medium ${isOverdue ? 'text-error-600' : 'text-gray-900'}`}>
                {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                {isOverdue && !isPaid && ' (Overdue)'}
              </Text>
            </View>
            {invoice.place_of_supply && (
              <View className="flex-row items-center py-3">
                <Text className="text-gray-500 w-28">Place of Supply</Text>
                <Text className="text-gray-900 flex-1">{invoice.place_of_supply}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Line Items */}
        <View className="px-4 mt-6">
          <Text className="text-gray-700 font-semibold mb-3">Items</Text>
          <Card>
            {invoice.items?.map((item: any, index: number) => (
              <View
                key={item.id || index}
                className={`py-3 ${
                  index < invoice.items.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <View className="flex-row justify-between">
                  <Text className="text-gray-900 font-medium flex-1" numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text className="text-gray-900 font-semibold ml-2">
                    {formatCurrency(item.total_amount)}
                  </Text>
                </View>
                <View className="flex-row mt-1">
                  <Text className="text-gray-500 text-sm">
                    {item.quantity} × {formatCurrency(item.rate)}
                  </Text>
                  {item.hsn_sac_code && (
                    <Text className="text-gray-400 text-sm ml-2">
                      HSN: {item.hsn_sac_code}
                    </Text>
                  )}
                </View>
                {(item.cgst_amount > 0 || item.sgst_amount > 0 || item.igst_amount > 0) && (
                  <Text className="text-gray-400 text-xs mt-1">
                    Tax: {item.igst_amount > 0
                      ? `IGST ${item.igst_rate}%`
                      : `CGST ${item.cgst_rate}% + SGST ${item.sgst_rate}%`
                    }
                  </Text>
                )}
              </View>
            ))}
          </Card>
        </View>

        {/* Summary */}
        <View className="px-4 mt-6">
          <Text className="text-gray-700 font-semibold mb-3">Summary</Text>
          <Card>
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-500">Subtotal</Text>
              <Text className="text-gray-900">{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discount_amount > 0 && (
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-500">Discount</Text>
                <Text className="text-success-600">
                  -{formatCurrency(invoice.discount_amount)}
                </Text>
              </View>
            )}
            {invoice.cgst_amount > 0 && (
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-500">CGST</Text>
                <Text className="text-gray-900">{formatCurrency(invoice.cgst_amount)}</Text>
              </View>
            )}
            {invoice.sgst_amount > 0 && (
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-500">SGST</Text>
                <Text className="text-gray-900">{formatCurrency(invoice.sgst_amount)}</Text>
              </View>
            )}
            {invoice.igst_amount > 0 && (
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-500">IGST</Text>
                <Text className="text-gray-900">{formatCurrency(invoice.igst_amount)}</Text>
              </View>
            )}
            {invoice.round_off !== 0 && (
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-500">Round Off</Text>
                <Text className="text-gray-900">{formatCurrency(invoice.round_off)}</Text>
              </View>
            )}
            <View className="flex-row justify-between py-3 border-t border-gray-200 mt-2">
              <Text className="text-gray-900 font-bold text-lg">Total</Text>
              <Text className="text-gray-900 font-bold text-lg">
                {formatCurrency(invoice.total_amount)}
              </Text>
            </View>
            {invoice.amount_paid > 0 && (
              <>
                <View className="flex-row justify-between py-2">
                  <Text className="text-gray-500">Amount Paid</Text>
                  <Text className="text-success-600">
                    -{formatCurrency(invoice.amount_paid)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-2">
                  <Text className="text-gray-700 font-semibold">Balance Due</Text>
                  <Text className="text-primary-600 font-bold">
                    {formatCurrency(invoice.balance_due)}
                  </Text>
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Notes */}
        {(invoice.notes || invoice.terms) && (
          <View className="px-4 mt-6">
            {invoice.notes && (
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Notes</Text>
                <Card padding="sm">
                  <Text className="text-gray-600">{invoice.notes}</Text>
                </Card>
              </View>
            )}
            {invoice.terms && (
              <View>
                <Text className="text-gray-700 font-semibold mb-2">Terms & Conditions</Text>
                <Card padding="sm">
                  <Text className="text-gray-600">{invoice.terms}</Text>
                </Card>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {!isPaid && invoice.status !== 'cancelled' && (
          <View className="px-4 mt-6 mb-8">
            <View className="flex-row gap-3">
              {invoice.status === 'draft' && (
                <Button
                  variant="outline"
                  fullWidth
                  icon="send"
                  onPress={() => sendMutation.mutate()}
                  loading={sendMutation.isPending}
                >
                  Send Invoice
                </Button>
              )}
              <Button
                variant="primary"
                fullWidth
                icon="cash"
                onPress={() => setShowPaymentSheet(true)}
              >
                Record Payment
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActions}
        onClose={() => setShowActions(false)}
        options={[
          {
            label: 'Download PDF',
            icon: 'download-outline',
            onPress: () => {/* Download PDF */},
          },
          {
            label: 'Print Invoice',
            icon: 'print-outline',
            onPress: () => {/* Print */},
          },
          {
            label: 'Send via WhatsApp',
            icon: 'logo-whatsapp',
            onPress: () => {/* Send WhatsApp */},
          },
          {
            label: 'Send via Email',
            icon: 'mail-outline',
            onPress: () => sendMutation.mutate(),
            disabled: !invoice.party?.email,
          },
          ...(invoice.status !== 'paid' && invoice.status !== 'cancelled'
            ? [
                {
                  label: 'Edit Invoice',
                  icon: 'create-outline' as const,
                  onPress: () => router.push(`/invoices/${id}/edit`),
                  disabled: invoice.status !== 'draft',
                },
                {
                  label: 'Void Invoice',
                  icon: 'ban-outline' as const,
                  onPress: handleVoid,
                  destructive: true,
                },
              ]
            : []),
        ]}
      />
    </View>
  );
}
