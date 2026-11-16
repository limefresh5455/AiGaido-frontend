import api from './api';

export interface ReferralActivity {
  user_id: number;
  user_name: string;
  user_email: string;
  referral_code: string;
  referral_count: number;
  paid_referral_count: number;
  referral_bonus_payment_get: number;
  wallet_balance: number;
}

export const getReferralActivities = async (limit: number = 50, offset: number = 0) => {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await api.get(`/referrals/admin/activities?${params.toString()}`);
    return {
      success: true,
      data: response.data.data as ReferralActivity[],
      total: response.data.total || 0,
    };
  } catch (error: any) {
    console.error('Fetch Referral Activities Error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error fetching referral activities.',
      data: [] as ReferralActivity[],
      total: 0,
    };
  }
};
