import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/stores/auth-store';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Select } from '../../src/components/ui/Select';

export default function BusinessSettingsScreen() {
  const { tenant, setTenant } = useAuthStore();
  const queryClient = useQueryClient();

  const [name, setName] = useState(tenant?.name || '');
  const [legalName, setLegalName] = useState(tenant?.legal_name || '');
  const [gstin, setGstin] = useState(tenant?.gstin || '');
  const [pan, setPan] = useState(tenant?.pan || '');
  const [businessType, setBusinessType] = useState(tenant?.business_type || 'proprietorship');
  const [industry, setIndustry] = useState(tenant?.industry || '');
  const [email, setEmail] = useState(tenant?.email || '');
  const [phone, setPhone] = useState(tenant?.phone || '');
  const [website, setWebsite] = useState(tenant?.website || '');
  const [address, setAddress] = useState(tenant?.address || '');
  const [city, setCity] = useState(tenant?.city || '');
  const [state, setState] = useState(tenant?.state || '');
  const [pincode, setPincode] = useState(tenant?.pincode || '');
  const [logo, setLogo] = useState<string | null>(tenant?.logo_url || null);

  const [gstinError, setGstinError] = useState('');
  const [panError, setPanError] = useState('');

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.tenants.update(data);
      return response.data;
    },
    onSuccess: (data) => {
      setTenant(data);
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      Alert.alert('Success', 'Business details updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update business details');
    },
  });

  const validateGSTIN = (value: string) => {
    if (!value) {
      setGstinError('');
      return true;
    }
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(value.toUpperCase())) {
      setGstinError('Invalid GSTIN format');
      return false;
    }
    setGstinError('');
    return true;
  };

  const validatePAN = (value: string) => {
    if (!value) {
      setPanError('');
      return true;
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(value.toUpperCase())) {
      setPanError('Invalid PAN format');
      return false;
    }
    setPanError('');
    return true;
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogo(result.assets[0].uri);
      // TODO: Upload logo to server
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    if (gstin && !validateGSTIN(gstin)) {
      return;
    }

    if (pan && !validatePAN(pan)) {
      return;
    }

    updateBusinessMutation.mutate({
      name: name.trim(),
      legal_name: legalName.trim() || undefined,
      gstin: gstin.toUpperCase() || undefined,
      pan: pan.toUpperCase() || undefined,
      business_type: businessType,
      industry: industry || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state || undefined,
      pincode: pincode.trim() || undefined,
    });
  };

  const hasChanges = () => {
    return (
      name !== (tenant?.name || '') ||
      legalName !== (tenant?.legal_name || '') ||
      gstin !== (tenant?.gstin || '') ||
      pan !== (tenant?.pan || '') ||
      businessType !== (tenant?.business_type || 'proprietorship') ||
      industry !== (tenant?.industry || '') ||
      email !== (tenant?.email || '') ||
      phone !== (tenant?.phone || '') ||
      website !== (tenant?.website || '') ||
      address !== (tenant?.address || '') ||
      city !== (tenant?.city || '') ||
      state !== (tenant?.state || '') ||
      pincode !== (tenant?.pincode || '')
    );
  };

  const businessTypeOptions = [
    { label: 'Proprietorship', value: 'proprietorship' },
    { label: 'Partnership', value: 'partnership' },
    { label: 'LLP', value: 'llp' },
    { label: 'Private Limited', value: 'private_limited' },
    { label: 'Public Limited', value: 'public_limited' },
    { label: 'One Person Company', value: 'opc' },
  ];

  const stateOptions = [
    { label: 'Andhra Pradesh', value: 'AP' },
    { label: 'Arunachal Pradesh', value: 'AR' },
    { label: 'Assam', value: 'AS' },
    { label: 'Bihar', value: 'BR' },
    { label: 'Chhattisgarh', value: 'CT' },
    { label: 'Delhi', value: 'DL' },
    { label: 'Goa', value: 'GA' },
    { label: 'Gujarat', value: 'GJ' },
    { label: 'Haryana', value: 'HR' },
    { label: 'Himachal Pradesh', value: 'HP' },
    { label: 'Jharkhand', value: 'JH' },
    { label: 'Karnataka', value: 'KA' },
    { label: 'Kerala', value: 'KL' },
    { label: 'Madhya Pradesh', value: 'MP' },
    { label: 'Maharashtra', value: 'MH' },
    { label: 'Manipur', value: 'MN' },
    { label: 'Meghalaya', value: 'ML' },
    { label: 'Mizoram', value: 'MZ' },
    { label: 'Nagaland', value: 'NL' },
    { label: 'Odisha', value: 'OR' },
    { label: 'Punjab', value: 'PB' },
    { label: 'Rajasthan', value: 'RJ' },
    { label: 'Sikkim', value: 'SK' },
    { label: 'Tamil Nadu', value: 'TN' },
    { label: 'Telangana', value: 'TG' },
    { label: 'Tripura', value: 'TR' },
    { label: 'Uttar Pradesh', value: 'UP' },
    { label: 'Uttarakhand', value: 'UK' },
    { label: 'West Bengal', value: 'WB' },
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
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Business Profile</Text>
          </View>
          {hasChanges() && (
            <Button
              title="Save"
              onPress={handleSave}
              loading={updateBusinessMutation.isPending}
              size="sm"
            />
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Logo Section */}
        <View className="items-center py-8 bg-white mb-4">
          <TouchableOpacity onPress={handlePickImage} className="relative">
            {logo ? (
              <Image
                source={{ uri: logo }}
                className="w-24 h-24 rounded-xl"
                resizeMode="cover"
              />
            ) : (
              <View className="w-24 h-24 rounded-xl bg-gray-100 items-center justify-center">
                <Ionicons name="business-outline" size={40} color="#9CA3AF" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 items-center justify-center border-2 border-white">
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text className="text-gray-500 text-sm mt-2">Tap to change logo</Text>
        </View>

        {/* Basic Info */}
        <View className="px-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Basic Information
          </Text>
          <Card>
            <Input
              label="Business Name"
              placeholder="Enter business name"
              value={name}
              onChangeText={setName}
            />

            <View className="mt-4">
              <Input
                label="Legal Name (optional)"
                placeholder="Registered legal name"
                value={legalName}
                onChangeText={setLegalName}
              />
            </View>

            <View className="mt-4">
              <Select
                label="Business Type"
                options={businessTypeOptions}
                value={businessType}
                onChange={setBusinessType}
              />
            </View>

            <View className="mt-4">
              <Input
                label="Industry (optional)"
                placeholder="e.g., Retail, Manufacturing"
                value={industry}
                onChangeText={setIndustry}
              />
            </View>
          </Card>
        </View>

        {/* Tax Information */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Tax Information
          </Text>
          <Card>
            <Input
              label="GSTIN (optional)"
              placeholder="e.g., 27AABCU9603R1ZM"
              value={gstin}
              onChangeText={(text) => {
                setGstin(text.toUpperCase());
                validateGSTIN(text);
              }}
              autoCapitalize="characters"
              error={gstinError}
              maxLength={15}
            />

            <View className="mt-4">
              <Input
                label="PAN (optional)"
                placeholder="e.g., ABCDE1234F"
                value={pan}
                onChangeText={(text) => {
                  setPan(text.toUpperCase());
                  validatePAN(text);
                }}
                autoCapitalize="characters"
                error={panError}
                maxLength={10}
              />
            </View>
          </Card>
        </View>

        {/* Contact Information */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Contact Information
          </Text>
          <Card>
            <Input
              label="Business Email (optional)"
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View className="mt-4">
              <Input
                label="Business Phone (optional)"
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View className="mt-4">
              <Input
                label="Website (optional)"
                placeholder="https://www.example.com"
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </Card>
        </View>

        {/* Address */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Business Address
          </Text>
          <Card>
            <Input
              label="Address"
              placeholder="Street address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />

            <View className="flex-row gap-4 mt-4">
              <View className="flex-1">
                <Input
                  label="City"
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="PIN Code"
                  placeholder="PIN"
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <View className="mt-4">
              <Select
                label="State"
                options={stateOptions}
                value={state}
                onChange={setState}
                placeholder="Select state"
              />
            </View>
          </Card>
        </View>

        {/* Invoice Branding Preview */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Invoice Preview
          </Text>
          <Card>
            <View className="flex-row items-center">
              {logo ? (
                <Image
                  source={{ uri: logo }}
                  className="w-16 h-16 rounded-lg"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-lg bg-gray-100 items-center justify-center">
                  <Ionicons name="business-outline" size={24} color="#9CA3AF" />
                </View>
              )}
              <View className="flex-1 ml-4">
                <Text className="text-gray-900 font-bold text-lg">{name || 'Business Name'}</Text>
                {gstin && <Text className="text-gray-500 text-sm">GSTIN: {gstin}</Text>}
                {address && (
                  <Text className="text-gray-500 text-sm" numberOfLines={1}>
                    {address}
                    {city ? `, ${city}` : ''}
                  </Text>
                )}
              </View>
            </View>
            <Text className="text-gray-400 text-xs text-center mt-4">
              This is how your business will appear on invoices
            </Text>
          </Card>
        </View>

        {/* Danger Zone */}
        <View className="px-4 mt-6">
          <Card padding="none">
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Business',
                  'This will permanently delete your business and all associated data. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        // Handle business deletion
                      },
                    },
                  ]
                );
              }}
              className="flex-row items-center py-4 px-4"
            >
              <View className="w-10 h-10 rounded-full bg-error-50 items-center justify-center">
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <Text className="text-error-600 font-medium ml-3">Delete Business</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
