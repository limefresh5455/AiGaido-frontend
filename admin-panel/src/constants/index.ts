export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const TIMEOUT = 10000;

export const ROUTES = {
  PAYMENT_REQUESTS: '/payment-requests',
  REFERRAL_ACTIVITIES: '/referral-activities',
  UPLOAD_PLACE: '/upload',
  LOGIN: '/login',
};

export const COLORS = {
  primary: '#3b2c85',
  textDark: '#111827',
  textLight: '#6b7280',
  background: '#f8f9fa',
  white: '#ffffff',
  accent: '#60a5fa',
};
