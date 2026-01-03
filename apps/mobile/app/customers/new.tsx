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
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Select } from '../../src/components/ui/Select';

interface CustomerForm {
  name: string;
  legal_name: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  state_code: string;
  pin_code: string;
  credit_limit: string;
  credit_period: string;
  opening_balance: string;
}

const INDIAN_STATES = [
  { label: 'Andhra Pradesh', value: '37' },
  { label: 'Delhi', value: '07' },
  { label: 'Gujarat', value: '24' },
  { label: 'Karnataka', value: '29' },
  { label: 'Kerala', value: '32' },
  { label: 'Maharashtra', value: '27' },
  { label: 'Tamil Nadu', value: '33' },
  { label: 'Telangana', value: '36' },
  { label: 'Uttar Pradesh', value: '09' },
  { label: 'West Bengal', value: '19' },
  // Add more states as needed
];

export default function NewCustomerScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CustomerForm>({
    name: '',
    legal_name: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    state_code: '',
    pin_code: '',
    credit_limit: '',
    credit_period: '30',
    opening_balance: '',
  });
  const [errors, setErrors] = useState<Partial<CustomerForm>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        legal_name: form.legal_name || form.name,
        type: 'customer',
        phone: form.phone || undefined,
        email: form.email || undefined,
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        address_line1: form.address_line1 || undefined,
        address_line2: form.address_line2 || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        state_code: form.state_code || undefined,
        pin_code: form.pin_code || undefined,
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : 0,
        credit_period: parseInt(form.credit_period) || 30,
        opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
      };
      return api.customers.create(payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      Alert.alert('Success', 'Customer created successfully');
      router.replace(`/customers/${response.data.id}`);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create customer');
    },
  });

  const updateField = (key: keyof CustomerForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerForm> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format';
    }

    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan)) {
      newErrors.pan = 'Invalid PAN format';
    }

    if (form.pin_code && !/^[0-9]{6}$/.test(form.pin_code)) {
      newErrors.pin_code = 'PIN code must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      createMutation.mutate();
    }
  };

  const handleStateChange = (stateCode: string) => {
    const state = INDIAN_STATES.find((s) => s.value === stateCode);
    updateField('state_code', stateCode);
    updateField('state', state?.label || '');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 flex-1">New Customer</Text>
          <Button
            variant="primary"
            size="sm"
            onPress={handleSubmit}
            loading={createMutation.isPending}
          >
            Save
          </Button>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-gray-700 font-semibold mb-4">Basic Information</Text>

          <Input
            label="Customer Name *"
            value={form.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="Enter customer name"
            error={errors.name}
            containerClassName="mb-4"
          />

          <Input
            label="Phone Number"
            value={form.phone}
            onChangeText={(v) => updateField('phone', v.replace(/[^0-9+]/g, ''))}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            leftIcon="call-outline"
            containerClassName="mb-4"
          />

          <Input
            label="Email"
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            placeholder="customer@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            error={errors.email}
          />
        </View>

        {/* Tax Info */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-gray-700 font-semibold mb-4">Tax Information</Text>

          <Input
            label="GSTIN"
            value={form.gstin}
            onChangeText={(v) => updateField('gstin', v.toUpperCase())}
            placeholder="27AABCU9603R1ZM"
            autoCapitalize="characters"
            maxLength={15}
            error={errors.gstin}
            hint="15-character GST Identification Number"
            containerClassName="mb-4"
          />

          <Input
            label="PAN"
            value={form.pan}
            onChangeText={(v) => updateField('pan', v.toUpperCase())}
            placeholder="AABCU9603R"
            autoCapitalize="characters"
            maxLength={10}
            error={errors.pan}
          />
        </View>

        {/* Address */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-gray-700 font-semibold mb-4">Address</Text>

          <Input
            label="Address Line 1"
            value={form.address_line1}
            onChangeText={(v) => updateField('address_line1', v)}
            placeholder="Street address"
            containerClassName="mb-4"
          />

          <Input
            label="Address Line 2"
            value={form.address_line2}
            onChangeText={(v) => updateField('address_line2', v)}
            placeholder="Apartment, building, floor"
            containerClassName="mb-4"
          />

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Input
                label="City"
                value={form.city}
                onChangeText={(v) => updateField('city', v)}
                placeholder="Mumbai"
              />
            </View>
            <View className="flex-1">
              <Input
                label="PIN Code"
                value={form.pin_code}
                onChangeText={(v) => updateField('pin_code', v.replace(/[^0-9]/g, ''))}
                placeholder="400001"
                keyboardType="number-pad"
                maxLength={6}
                error={errors.pin_code}
              />
            </View>
          </View>

          <Select
            label="State"
            value={form.state_code}
            options={INDIAN_STATES}
            onChange={handleStateChange}
            placeholder="Select state"
          />
        </View>

        {/* Advanced Options */}
        <TouchableOpacity
          onPress={() => setShowAdvanced(!showAdvanced)}
          className="flex-row items-center justify-between bg-white rounded-xl p-4 mb-4"
        >
          <Text className="text-gray-700 font-semibold">Advanced Options</Text>
          <Ionicons
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View className="bg-white rounded-xl p-4 mb-4">
            <Input
              label="Legal Name"
              value={form.legal_name}
              onChangeText={(v) => updateField('legal_name', v)}
              placeholder="Legal/registered name"
              hint="If different from display name"
              containerClassName="mb-4"
            />

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Input
                  label="Credit Limit"
                  value={form.credit_limit}
                  onChangeText={(v) => updateField('credit_limit', v.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  prefix="₹"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Credit Period"
                  value={form.credit_period}
                  onChangeText={(v) => updateField('credit_period', v.replace(/[^0-9]/g, ''))}
                  placeholder="30"
                  keyboardType="number-pad"
                  suffix="days"
                />
              </View>
            </View>

            <Input
              label="Opening Balance"
              value={form.opening_balance}
              onChangeText={(v) => updateField('opening_balance', v.replace(/[^0-9.-]/g, ''))}
              placeholder="0"
              keyboardType="decimal-pad"
              prefix="₹"
              hint="Positive = receivable, Negative = payable"
            />
          </View>
        )}

        {/* Submit Button (Mobile) */}
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onPress={handleSubmit}
          loading={createMutation.isPending}
          icon="checkmark"
          className="mb-8"
        >
          Create Customer
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
