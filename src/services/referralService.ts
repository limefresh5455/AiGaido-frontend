import { api } from './api';

export interface ReferralItem {
  id: number;
  referee_name: string;
  status: string;
  has_paid: boolean;
  commission_earned_inr: number;
  credits_earned: number;
  created_at: string;
}

export interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  total_paid_referrals: number;
  wallet_balance_inr: number;
  total_commission_earned_inr: number;
  currency: string;
  total_credits_earned: number;
  referrals: ReferralItem[];
}

export interface WithdrawalItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  payment: number;
  payout_method: string;
  upi_id?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
}

export interface WithdrawalHistoryResponse {
  data: WithdrawalItem[];
  total: number;
}

export interface WithdrawRequest {
  upi_id: string;
  payment: number;
}

export const referralService = {
  getMyReferrals: async (): Promise<ReferralStats> => {
    const res = await api.get('/referrals/me');
    return res.data?.data ?? res.data;
  },
  applyReferral: async (referralCode: string): Promise<ReferralStats> => {
    const res = await api.post('/referrals/apply', { referral_code: referralCode });
    return res.data?.data ?? res.data;
  },
  validateReferal: async (referralCode: string): Promise<ReferralStats> => {
    const res = await api.get(`/referrals/validate/${referralCode}`);
    return res.data?.data ?? res.data;
  },
  getWithdrawals: async (): Promise<WithdrawalHistoryResponse> => {
    const res = await api.get('/referrals/payment-requests');
    return res.data;
  },
  withdrawFunds: async (payload: WithdrawRequest) => {
    const res = await api.post('/referrals/payment-request', payload);
    return res.data;
  },
};
