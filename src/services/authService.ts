import { api } from './api';
import {
  SignupRequest,
  SignupResponse,
  VerifyOTPRequest,
  TokenResponse,
  LoginRequest,
  UserResponse,
  APIResponse,
  ResendOTPRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from './types';

export const authService = {
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    const response = await api.post<SignupResponse>('/auth/signup', data);
    return response.data;
  },

  verifyOtp: async (data: VerifyOTPRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/verify-otp', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<any>('/auth/me');
    // Handle both wrapped and unwrapped response
    return response.data?.data || response.data;
  },

  resendOtp: async (data: ResendOTPRequest): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/auth/resend-signup', data);
    return response.data;
  },



  forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await api.post<ResetPasswordResponse>('/auth/reset-password', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const response = await api.post<ChangePasswordResponse>('/auth/change-password', data);
    return response?.data;
  },
};
