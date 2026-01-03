import { BookKeepClient } from '../client';

export interface Tenant {
  id: string;
  name: string;
  legal_name?: string;
  gstin?: string;
  pan?: string;
  business_type?: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
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

export interface Invitation {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
}

export interface TeamData {
  members: TeamMember[];
  invitations: Invitation[];
}

export class TenantsApi {
  constructor(private client: BookKeepClient) {}

  async get() {
    return this.client.get<Tenant>('/tenant');
  }

  async update(data: Partial<Tenant>) {
    return this.client.put<Tenant>('/tenant', data);
  }

  async getTeam() {
    return this.client.get<TeamData>('/tenant/team');
  }

  async inviteMember(data: { email?: string; phone?: string; role: string }) {
    return this.client.post<Invitation>('/tenant/invitations', data);
  }

  async cancelInvitation(invitationId: string) {
    return this.client.delete(`/tenant/invitations/${invitationId}`);
  }

  async resendInvitation(invitationId: string) {
    return this.client.post(`/tenant/invitations/${invitationId}/resend`, {});
  }

  async updateMemberRole(memberId: string, role: string) {
    return this.client.put(`/tenant/members/${memberId}`, { role });
  }

  async removeMember(memberId: string) {
    return this.client.delete(`/tenant/members/${memberId}`);
  }
}
