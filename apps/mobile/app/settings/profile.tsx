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
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth-store';
import { api } from '../../src/lib/api';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';

export default function ProfileScreen() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.users.updateProfile(data);
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data);
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.users.changePassword(data);
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to change password');
    },
  });

  const handleUpdateProfile = () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return;
    }

    updateProfileMutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || undefined,
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const hasProfileChanges = () => {
    return (
      firstName !== (user?.first_name || '') ||
      lastName !== (user?.last_name || '') ||
      email !== (user?.email || '')
    );
  };

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
            <Text className="text-xl font-bold text-gray-900">Edit Profile</Text>
          </View>
          {hasProfileChanges() && (
            <Button
              title="Save"
              onPress={handleUpdateProfile}
              loading={updateProfileMutation.isPending}
              size="sm"
            />
          )}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Avatar Section */}
        <View className="items-center py-8">
          <View className="relative">
            <Avatar
              name={`${firstName} ${lastName}`}
              size="xl"
            />
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Coming Soon', 'Photo upload will be available soon');
              }}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary-600 items-center justify-center border-4 border-white"
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text className="text-gray-900 text-xl font-bold mt-4">
            {firstName} {lastName}
          </Text>
          <Text className="text-gray-500">{phone || email}</Text>
        </View>

        {/* Personal Information */}
        <View className="px-4">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Personal Information
          </Text>
          <Card>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Input
                  label="First Name"
                  placeholder="Enter first name"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Last Name"
                  placeholder="Enter last name"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View className="mt-4">
              <Input
                label="Email Address"
                placeholder="Enter email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mt-4">
              <Input
                label="Phone Number"
                value={phone}
                editable={false}
                hint="Phone number cannot be changed"
              />
            </View>
          </Card>
        </View>

        {/* Security Section */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Security
          </Text>
          <Card padding="none">
            <TouchableOpacity
              onPress={() => setShowPasswordSection(!showPasswordSection)}
              className="flex-row items-center justify-between py-4 px-4"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                  <Ionicons name="lock-closed-outline" size={20} color="#4F46E5" />
                </View>
                <View className="ml-3">
                  <Text className="text-gray-900 font-medium">Change Password</Text>
                  <Text className="text-gray-500 text-sm">Update your password</Text>
                </View>
              </View>
              <Ionicons
                name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View className="px-4 pb-4 border-t border-gray-100 pt-4">
                <Input
                  label="Current Password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />

                <View className="mt-4">
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    hint="Must be at least 8 characters"
                  />
                </View>

                <View className="mt-4">
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    error={
                      confirmPassword && newPassword !== confirmPassword
                        ? 'Passwords do not match'
                        : undefined
                    }
                  />
                </View>

                <Button
                  title="Change Password"
                  onPress={handleChangePassword}
                  loading={changePasswordMutation.isPending}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                  className="mt-4"
                />
              </View>
            )}
          </Card>
        </View>

        {/* Account Info */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Account
          </Text>
          <Card>
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-500">Account ID</Text>
              <Text className="text-gray-900 font-mono text-sm">
                {user?.id?.slice(0, 8) || 'N/A'}
              </Text>
            </View>
            <View className="flex-row justify-between py-2 border-t border-gray-100">
              <Text className="text-gray-500">Member Since</Text>
              <Text className="text-gray-900">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-IN', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
            <View className="flex-row justify-between py-2 border-t border-gray-100">
              <Text className="text-gray-500">Role</Text>
              <Text className="text-gray-900 capitalize">{user?.role || 'Owner'}</Text>
            </View>
          </Card>
        </View>

        {/* Linked Accounts */}
        <View className="px-4 mt-6">
          <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
            Linked Accounts
          </Text>
          <Card padding="none">
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Coming Soon', 'Google linking will be available soon');
              }}
              className="flex-row items-center justify-between py-4 px-4 border-b border-gray-100"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                </View>
                <View className="ml-3">
                  <Text className="text-gray-900 font-medium">Google</Text>
                  <Text className="text-gray-500 text-sm">Not linked</Text>
                </View>
              </View>
              <Text className="text-primary-600 font-medium">Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Alert.alert('Coming Soon', 'Apple linking will be available soon');
              }}
              className="flex-row items-center justify-between py-4 px-4"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                </View>
                <View className="ml-3">
                  <Text className="text-gray-900 font-medium">Apple</Text>
                  <Text className="text-gray-500 text-sm">Not linked</Text>
                </View>
              </View>
              <Text className="text-primary-600 font-medium">Link</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Sessions */}
        <View className="px-4 mt-6">
          <Card padding="none">
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Sign Out Everywhere',
                  'This will sign you out from all devices except this one.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign Out',
                      style: 'destructive',
                      onPress: () => {
                        // Handle sign out from all devices
                      },
                    },
                  ]
                );
              }}
              className="flex-row items-center py-4 px-4"
            >
              <View className="w-10 h-10 rounded-full bg-error-50 items-center justify-center">
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text className="text-error-600 font-medium ml-3">
                Sign Out From All Devices
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
