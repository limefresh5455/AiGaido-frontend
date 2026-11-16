import { api } from './api';
import {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  ListPlansResponse,
  APIResponse,
  PaymentHistoryResponse,
} from './types';

export const paymentService = {
  listPlans: async (): Promise<ListPlansResponse> => {
    const response = await api.get<ListPlansResponse>('/payments/packages');
    return response.data;
  },

  createPaymentIntent: async (data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> => {
    const response = await api.post<CreatePaymentIntentResponse>('/payments/orders', data);
    return response.data;
  },

  confirmPayment: async (data: ConfirmPaymentRequest): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/payments/verify', data);
    return response.data;
  },

  getPaymentHistory: async (): Promise<PaymentHistoryResponse> => {
    const response = await api.get<PaymentHistoryResponse>('/payments');
    return response.data;
  },

  getPayoutDetails: async (payoutId: string): Promise<any> => {
    const response = await api.get<any>(`/payments/${payoutId}`);
    return response.data;
  },
};
