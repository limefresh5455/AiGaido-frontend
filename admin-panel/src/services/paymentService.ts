import api from './api';

export interface PaymentRequest {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  payment: number;
  upi_id: string;
  status: string;
  admin_notes: string;
  created_at: string;
  processed_at: string;
}

export const getPaymentRequests = async (
  status?: string,
  limit: number = 50,
  offset: number = 0
) => {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await api.get(`/referrals/admin/payment-requests?${params.toString()}`);
    return {
      success: true,
      data: response.data.data as PaymentRequest[],
      total: response.data.total,
    };
  } catch (error: any) {
    console.error('Fetch Payment Requests Error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Error fetching payment requests.',
      data: [] as PaymentRequest[],
    };
  }
};

export const updatePaymentRequestStatus = async (
  requestId: number,
  status: string,
  adminNotes: string
) => {
  try {
    const response = await api.post(`/referrals/admin/payment-requests/${requestId}/status`, {
      status,
      admin_notes: adminNotes,
    });
    return { success: true, message: 'Status updated successfully.', data: response.data };
  } catch (error: any) {
    console.error('Update Payment Request Error:', error);
    return { success: false, message: error.response?.data?.message || 'Error updating status.' };
  }
};
