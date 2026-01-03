import { BaseEntity, UUID } from './common';

export interface User extends BaseEntity {
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_email_verified: boolean;
  is_phone_verified?: boolean;
  tenant_id: UUID;
  roles: string[];
}

export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  role: string;
  is_primary: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
  tenant: Tenant;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password?: string;
  otp?: string;
}

export interface RegisterRequest {
  phone?: string;
  email?: string;
  password: string;
  first_name: string;
  last_name: string;
  business_name: string;
  business_type?: string;
}

export interface OTPRequest {
  phone: string;
  purpose: 'login' | 'verify' | 'reset';
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
  purpose: 'login' | 'verify' | 'reset';
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
}
