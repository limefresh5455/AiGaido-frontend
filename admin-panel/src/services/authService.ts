import api from './api';

export const loginUser = async (credentials: any) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Login Error:', error);
    return { success: false, message: error.response?.data?.message || 'Login failed.' };
  }
};
