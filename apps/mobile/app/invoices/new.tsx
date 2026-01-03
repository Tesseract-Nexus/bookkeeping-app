import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { Input, AmountInput } from '../../src/components/ui/Input';
import { Button, IconButton } from '../../src/components/ui/Button';
import { Select, DatePicker } from '../../src/components/ui/Select';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { LoadingState } from '../../src/components/ui/LoadingState';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  hsn_code?: string;
  gst_rate: number;
  amount: number;
}

export default function NewInvoiceScreen() {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(addDays(new Date(), 30));
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [showCustomerSheet, setShowCustomerSheet] = useState(false);
  const [showItemSheet, setShowItemSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);

  // Item form state
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemRate, setItemRate] = useState('');
  const [itemHsnCode, setItemHsnCode] = useState('');
  const [itemGstRate, setItemGstRate] = useState('18');

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.customers.list();
      return response.data.customers || [];
    },
  });

  const selectedCustomer = customers?.find((c: any) => c.id === customerId);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.invoices.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      router.replace(`/invoices/${data.id}`);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create invoice');
    },
  });

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return items.reduce((sum, item) => {
      return sum + (item.amount * item.gst_rate) / 100;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleAddItem = () => {
    const quantity = parseFloat(itemQuantity) || 1;
    const rate = parseFloat(itemRate) || 0;
    const amount = quantity * rate;

    if (!itemDescription.trim()) {
      Alert.alert('Error', 'Please enter item description');
      return;
    }

    if (rate <= 0) {
      Alert.alert('Error', 'Please enter a valid rate');
      return;
    }

    const newItem: InvoiceItem = {
      id: editingItem?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      description: itemDescription.trim(),
      quantity,
      rate,
      hsn_code: itemHsnCode.trim() || undefined,
      gst_rate: parseFloat(itemGstRate) || 0,
      amount,
    };

    if (editingItem) {
      setItems(items.map((item) => (item.id === editingItem.id ? newItem : item)));
    } else {
      setItems([...items, newItem]);
    }

    resetItemForm();
    setShowItemSheet(false);
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingItem(item);
    setItemDescription(item.description);
    setItemQuantity(item.quantity.toString());
    setItemRate(item.rate.toString());
    setItemHsnCode(item.hsn_code || '');
    setItemGstRate(item.gst_rate.toString());
    setShowItemSheet(true);
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setItems(items.filter((item) => item.id !== itemId)),
      },
    ]);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemDescription('');
    setItemQuantity('1');
    setItemRate('');
    setItemHsnCode('');
    setItemGstRate('18');
  };

  const handleSubmit = () => {
    if (!customerId) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    createInvoiceMutation.mutate({
      customer_id: customerId,
      invoice_date: format(invoiceDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        hsn_code: item.hsn_code,
        gst_rate: item.gst_rate,
      })),
      notes,
      terms_and_conditions: termsAndConditions,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const gstOptions = [
    { label: 'No GST (0%)', value: '0' },
    { label: 'GST 5%', value: '5' },
    { label: 'GST 12%', value: '12' },
    { label: 'GST 18%', value: '18' },
    { label: 'GST 28%', value: '28' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">New Invoice</Text>
          </View>
          <Button
            title="Create"
            onPress={handleSubmit}
            loading={createInvoiceMutation.isPending}
            disabled={!customerId || items.length === 0}
            size="sm"
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Customer Selection */}
        <View className="px-4 mt-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Bill To
          </Text>
          <TouchableOpacity
            onPress={() => setShowCustomerSheet(true)}
            className="bg-white rounded-xl p-4 border border-gray-200"
          >
            {selectedCustomer ? (
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center">
                  <Text className="text-primary-600 text-lg font-bold">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 font-semibold">{selectedCustomer.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    {selectedCustomer.phone || selectedCustomer.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="person-add-outline" size={24} color="#4F46E5" />
                  <Text className="text-primary-600 font-medium ml-3">Select Customer</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Invoice Details */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Invoice Details
          </Text>
          <Card>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <DatePicker
                  label="Invoice Date"
                  value={invoiceDate}
                  onChange={setInvoiceDate}
                />
              </View>
              <View className="flex-1">
                <DatePicker
                  label="Due Date"
                  value={dueDate}
                  onChange={setDueDate}
                  minimumDate={invoiceDate}
                />
              </View>
            </View>
          </Card>
        </View>

        {/* Items */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
              Items
            </Text>
            <TouchableOpacity
              onPress={() => {
                resetItemForm();
                setShowItemSheet(true);
              }}
            >
              <Text className="text-primary-600 text-sm font-medium">+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <Card>
              <View className="items-center py-8">
                <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-400 mt-2">No items added yet</Text>
                <TouchableOpacity
                  onPress={() => setShowItemSheet(true)}
                  className="mt-3"
                >
                  <Text className="text-primary-600 font-medium">Add your first item</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <Card padding="none">
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleEditItem(item)}
                  onLongPress={() => handleDeleteItem(item.id)}
                  className={`p-4 ${index < items.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className="flex-row justify-between">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">{item.description}</Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        {item.quantity} x {formatCurrency(item.rate)}
                        {item.hsn_code ? ` • HSN: ${item.hsn_code}` : ''}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-gray-900 font-semibold">
                        {formatCurrency(item.amount)}
                      </Text>
                      {item.gst_rate > 0 && (
                        <Text className="text-gray-400 text-xs">
                          +{item.gst_rate}% GST
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          )}
        </View>

        {/* Summary */}
        {items.length > 0 && (
          <View className="px-4 mt-6">
            <Card>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Subtotal</Text>
                <Text className="text-gray-700">{formatCurrency(calculateSubtotal())}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">GST</Text>
                <Text className="text-gray-700">{formatCurrency(calculateTax())}</Text>
              </View>
              <View className="border-t border-gray-100 pt-2 mt-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-900 font-semibold">Total</Text>
                  <Text className="text-primary-600 font-bold text-xl">
                    {formatCurrency(calculateTotal())}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Notes */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Additional Info
          </Text>
          <Card>
            <Input
              label="Notes (optional)"
              placeholder="Add notes for customer..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
            <View className="mt-4">
              <Input
                label="Terms & Conditions (optional)"
                placeholder="Payment terms, delivery details..."
                value={termsAndConditions}
                onChangeText={setTermsAndConditions}
                multiline
                numberOfLines={3}
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Customer Selection Sheet */}
      <BottomSheet
        visible={showCustomerSheet}
        onClose={() => setShowCustomerSheet(false)}
        title="Select Customer"
      >
        {loadingCustomers ? (
          <LoadingState />
        ) : (
          <ScrollView className="max-h-96">
            <TouchableOpacity
              onPress={() => {
                setShowCustomerSheet(false);
                router.push('/customers/new');
              }}
              className="flex-row items-center py-4 px-4 border-b border-gray-100"
            >
              <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                <Ionicons name="add" size={24} color="#4F46E5" />
              </View>
              <Text className="text-primary-600 font-medium ml-3">Add New Customer</Text>
            </TouchableOpacity>
            {customers?.map((customer: any) => (
              <TouchableOpacity
                key={customer.id}
                onPress={() => {
                  setCustomerId(customer.id);
                  setShowCustomerSheet(false);
                }}
                className="flex-row items-center py-4 px-4 border-b border-gray-100"
              >
                <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                  <Text className="text-gray-600 font-semibold">
                    {customer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 font-medium">{customer.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    {customer.phone || customer.email}
                  </Text>
                </View>
                {customerId === customer.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </BottomSheet>

      {/* Add/Edit Item Sheet */}
      <BottomSheet
        visible={showItemSheet}
        onClose={() => {
          resetItemForm();
          setShowItemSheet(false);
        }}
        title={editingItem ? 'Edit Item' : 'Add Item'}
      >
        <View className="px-4">
          <Input
            label="Description"
            placeholder="Item or service name"
            value={itemDescription}
            onChangeText={setItemDescription}
          />

          <View className="flex-row gap-4 mt-4">
            <View className="flex-1">
              <Input
                label="Quantity"
                placeholder="1"
                value={itemQuantity}
                onChangeText={setItemQuantity}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <AmountInput
                label="Rate"
                placeholder="0"
                value={itemRate}
                onChangeText={setItemRate}
                showCurrencySymbol
              />
            </View>
          </View>

          <View className="flex-row gap-4 mt-4">
            <View className="flex-1">
              <Input
                label="HSN Code (optional)"
                placeholder="e.g., 9983"
                value={itemHsnCode}
                onChangeText={setItemHsnCode}
              />
            </View>
            <View className="flex-1">
              <Select
                label="GST Rate"
                options={gstOptions}
                value={itemGstRate}
                onChange={setItemGstRate}
              />
            </View>
          </View>

          {itemRate && (
            <View className="mt-4 p-4 bg-gray-50 rounded-xl">
              <View className="flex-row justify-between">
                <Text className="text-gray-500">Amount</Text>
                <Text className="text-gray-900 font-semibold">
                  {formatCurrency(
                    (parseFloat(itemQuantity) || 1) * (parseFloat(itemRate) || 0)
                  )}
                </Text>
              </View>
            </View>
          )}

          <View className="flex-row gap-4 mt-6 mb-4">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                resetItemForm();
                setShowItemSheet(false);
              }}
              className="flex-1"
            />
            <Button
              title={editingItem ? 'Update' : 'Add Item'}
              onPress={handleAddItem}
              className="flex-1"
            />
          </View>
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}
