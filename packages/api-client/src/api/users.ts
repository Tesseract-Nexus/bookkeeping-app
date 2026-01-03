import { BookKeepClient } from '../client';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export class UsersApi {
  constructor(private client: BookKeepClient) {}

  async getProfile() {
    return this.client.get<User>('/users/me');
  }

  async updateProfile(data: UpdateProfileData) {
    return this.client.put<User>('/users/me', data);
  }

  async changePassword(data: ChangePasswordData) {
    return this.client.post('/users/me/password', data);
  }

  async uploadAvatar(file: File | Blob) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.client.post<{ avatar_url: string }>('/users/me/avatar', formData);
  }
}
