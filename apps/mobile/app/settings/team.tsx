import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth-store';
import { Card, ListCard } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge, StatusBadge } from '../../src/components/ui/Badge';
import { Button, FAB } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { BottomSheet, ActionSheet } from '../../src/components/ui/BottomSheet';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { EmptyState, ErrorState } from '../../src/components/ui/EmptyState';

interface TeamMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

interface Invitation {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

export default function TeamScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

  const { data: teamData, isLoading, error, refetch } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const response = await api.tenants.getTeam();
      return response.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.tenants.inviteMember(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setShowInviteSheet(false);
      resetInviteForm();
      Alert.alert('Success', 'Invitation sent successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await api.tenants.updateMemberRole(memberId, role);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      Alert.alert('Success', 'Role updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update role');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await api.tenants.removeMember(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      Alert.alert('Success', 'Member removed successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to remove member');
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.tenants.cancelInvitation(invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      Alert.alert('Success', 'Invitation cancelled');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to cancel invitation');
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.tenants.resendInvitation(invitationId);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Invitation resent');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to resend invitation');
    },
  });

  const resetInviteForm = () => {
    setInviteEmail('');
    setInvitePhone('');
    setInviteRole('staff');
  };

  const handleInvite = () => {
    if (!inviteEmail && !invitePhone) {
      Alert.alert('Error', 'Please enter email or phone number');
      return;
    }

    inviteMutation.mutate({
      email: inviteEmail.trim() || undefined,
      phone: invitePhone.trim() || undefined,
      role: inviteRole,
    });
  };

  const handleMemberPress = (member: TeamMember) => {
    if (member.user_id === user?.id) return; // Can't modify yourself
    setSelectedMember(member);
    setShowMemberActions(true);
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${selectedMember.first_name} ${selectedMember.last_name}? They will lose access to this business.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeMemberMutation.mutate(selectedMember.id);
            setShowMemberActions(false);
            setSelectedMember(null);
          },
        },
      ]
    );
  };

  const handleCancelInvitation = (invitation: Invitation) => {
    Alert.alert(
      'Cancel Invitation',
      'Are you sure you want to cancel this invitation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelInvitationMutation.mutate(invitation.id),
        },
      ]
    );
  };

  const roleOptions = [
    { label: 'Admin', value: 'admin', description: 'Full access except owner actions' },
    { label: 'Accountant', value: 'accountant', description: 'Manage transactions & reports' },
    { label: 'Staff', value: 'staff', description: 'Basic access, add transactions' },
    { label: 'Viewer', value: 'viewer', description: 'View-only access' },
  ];

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
      owner: 'primary',
      admin: 'success',
      accountant: 'warning',
      staff: 'default',
      viewer: 'default',
    };
    return variants[role] || 'default';
  };

  const members: TeamMember[] = teamData?.members || [];
  const invitations: Invitation[] = teamData?.invitations || [];
  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  const memberActions = [
    {
      id: 'change-role',
      title: 'Change Role',
      icon: 'shield-outline',
      onPress: () => {
        setShowMemberActions(false);
        // Show role selection
        Alert.alert(
          'Select Role',
          'Choose a new role for this member',
          [
            ...roleOptions.map((option) => ({
              text: option.label,
              onPress: () => {
                if (selectedMember) {
                  updateRoleMutation.mutate({
                    memberId: selectedMember.id,
                    role: option.value,
                  });
                }
              },
            })),
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      },
    },
    {
      id: 'remove',
      title: 'Remove from Team',
      icon: 'person-remove-outline',
      destructive: true,
      onPress: handleRemoveMember,
    },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Team</Text>
          </View>
        </View>
        <LoadingState />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Team</Text>
          </View>
        </View>
        <ErrorState message="Failed to load team" onRetry={refetch} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Team</Text>
          </View>
          <Button
            title="Invite"
            size="sm"
            leftIcon="person-add-outline"
            onPress={() => setShowInviteSheet(true)}
          />
        </View>

        {/* Tabs */}
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('members')}
            className={`flex-1 py-2 rounded-md ${
              activeTab === 'members' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === 'members' ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              Members ({members.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('invitations')}
            className={`flex-1 py-2 rounded-md ${
              activeTab === 'invitations' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <View className="flex-row items-center justify-center">
              <Text
                className={`text-center font-medium ${
                  activeTab === 'invitations' ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                Pending
              </Text>
              {pendingInvitations.length > 0 && (
                <View className="ml-2 bg-warning-500 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {pendingInvitations.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === 'members' ? (
          <View className="px-4 mt-4">
            {members.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No team members"
                message="Invite team members to collaborate"
                actionLabel="Invite Member"
                onAction={() => setShowInviteSheet(true)}
              />
            ) : (
              <Card padding="none">
                {members.map((member, index) => {
                  const isCurrentUser = member.user_id === user?.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => handleMemberPress(member)}
                      disabled={isCurrentUser}
                      className={`flex-row items-center py-4 px-4 ${
                        index < members.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <Avatar
                        name={`${member.first_name} ${member.last_name}`}
                        size="md"
                      />
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text className="text-gray-900 font-medium">
                            {member.first_name} {member.last_name}
                          </Text>
                          {isCurrentUser && (
                            <Badge variant="primary" size="sm" className="ml-2">
                              You
                            </Badge>
                          )}
                        </View>
                        <Text className="text-gray-500 text-sm">
                          {member.email || member.phone}
                        </Text>
                      </View>
                      <Badge variant={getRoleBadgeVariant(member.role)} size="sm" rounded>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            {/* Role Descriptions */}
            <View className="mt-6">
              <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2 px-1">
                Role Permissions
              </Text>
              <Card>
                {roleOptions.map((role, index) => (
                  <View
                    key={role.value}
                    className={`py-3 ${
                      index < roleOptions.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <Text className="text-gray-900 font-medium">{role.label}</Text>
                    <Text className="text-gray-500 text-sm">{role.description}</Text>
                  </View>
                ))}
              </Card>
            </View>
          </View>
        ) : (
          <View className="px-4 mt-4">
            {pendingInvitations.length === 0 ? (
              <EmptyState
                icon="mail-outline"
                title="No pending invitations"
                message="All invitations have been accepted or expired"
              />
            ) : (
              <Card padding="none">
                {pendingInvitations.map((invitation, index) => (
                  <View
                    key={invitation.id}
                    className={`py-4 px-4 ${
                      index < pendingInvitations.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium">
                          {invitation.email || invitation.phone}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Badge variant="warning" size="sm" rounded>
                            Pending
                          </Badge>
                          <Text className="text-gray-400 text-xs ml-2">
                            Expires{' '}
                            {new Date(invitation.expires_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Badge variant={getRoleBadgeVariant(invitation.role)} size="sm" rounded>
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                      </Badge>
                    </View>
                    <View className="flex-row gap-3 mt-3">
                      <TouchableOpacity
                        onPress={() => resendInvitationMutation.mutate(invitation.id)}
                        className="flex-row items-center"
                      >
                        <Ionicons name="refresh-outline" size={16} color="#4F46E5" />
                        <Text className="text-primary-600 text-sm ml-1">Resend</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleCancelInvitation(invitation)}
                        className="flex-row items-center"
                      >
                        <Ionicons name="close-outline" size={16} color="#EF4444" />
                        <Text className="text-error-600 text-sm ml-1">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Invite Sheet */}
      <BottomSheet
        visible={showInviteSheet}
        onClose={() => {
          setShowInviteSheet(false);
          resetInviteForm();
        }}
        title="Invite Team Member"
      >
        <View className="px-4">
          <Input
            label="Email Address"
            placeholder="Enter email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View className="items-center my-3">
            <Text className="text-gray-400 text-sm">or</Text>
          </View>

          <Input
            label="Phone Number"
            placeholder="Enter phone number"
            value={invitePhone}
            onChangeText={setInvitePhone}
            keyboardType="phone-pad"
          />

          <View className="mt-4">
            <Select
              label="Role"
              options={roleOptions.map((r) => ({ label: r.label, value: r.value }))}
              value={inviteRole}
              onChange={setInviteRole}
            />
          </View>

          <View className="bg-gray-50 rounded-xl p-3 mt-4">
            <Text className="text-gray-500 text-sm">
              {roleOptions.find((r) => r.value === inviteRole)?.description}
            </Text>
          </View>

          <View className="flex-row gap-4 mt-6 mb-4">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setShowInviteSheet(false);
                resetInviteForm();
              }}
              className="flex-1"
            />
            <Button
              title="Send Invite"
              onPress={handleInvite}
              loading={inviteMutation.isPending}
              className="flex-1"
            />
          </View>
        </View>
      </BottomSheet>

      {/* Member Actions Sheet */}
      <ActionSheet
        visible={showMemberActions}
        onClose={() => {
          setShowMemberActions(false);
          setSelectedMember(null);
        }}
        title={
          selectedMember
            ? `${selectedMember.first_name} ${selectedMember.last_name}`
            : ''
        }
        actions={memberActions}
      />
    </View>
  );
}
