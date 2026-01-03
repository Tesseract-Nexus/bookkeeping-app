import { BookKeepClient } from '../client';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  OTPRequest,
  OTPVerifyRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ProfileUpdateRequest,
  User,
} from '../types';

export class AuthApi {
  constructor(private client: BookKeepClient) {}

  async register(data: RegisterRequest) {
    return this.client.post<{ user_id: string; tenant_id: string; verification_required: boolean }>(
      '/auth/register',
      data
    );
  }

  async login(data: LoginRequest) {
    return this.client.post<AuthResponse>('/auth/login', data);
  }

  async requestOTP(data: OTPRequest) {
    return this.client.post<{ message: string }>('/auth/otp/request', data);
  }

  async verifyOTP(data: OTPVerifyRequest) {
    return this.client.post<AuthResponse>('/auth/otp/verify', data);
  }

  async refreshToken(data: RefreshTokenRequest) {
    return this.client.post<AuthResponse>('/auth/refresh', data);
  }

  async logout() {
    return this.client.post<{ message: string }>('/logout');
  }

  async getProfile() {
    return this.client.get<{ user: User }>('/me');
  }

  async updateProfile(data: ProfileUpdateRequest) {
    return this.client.put<User>('/me', data);
  }

  async changePassword(data: ChangePasswordRequest) {
    return this.client.post<{ message: string }>('/change-password', data);
  }

  async forgotPassword(data: ForgotPasswordRequest) {
    return this.client.post<{ message: string }>('/auth/forgot-password', data);
  }

  async resetPassword(data: ResetPasswordRequest) {
    return this.client.post<{ message: string }>('/auth/reset-password', data);
  }

  async verifyEmail(token: string) {
    return this.client.post<{ message: string }>('/auth/verify-email', { token });
  }
}
