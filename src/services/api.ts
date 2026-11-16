import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reset } from '../navigation/NavigationService';
import { Alert } from 'react-native';

export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async config => {
    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${config.baseURL || ''}${
        config.url
      }`,
    );
    if (config.params) console.log('Params:', JSON.stringify(config.params));
    if (config.data) console.log('Data:', JSON.stringify(config.data));

    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  response => {
    console.log(
      `[API Response] ${response.config.method?.toUpperCase()} ${
        response.config.baseURL || ''
      }${response.config.url} - Status: ${JSON.stringify(
        response?.data?.data,
      )}`,
    );
    return response;
  },
  async error => {
    const originalRequest = error.config;
    console.log(
      `[API Error] ${originalRequest?.method?.toUpperCase()} ${
        originalRequest?.baseURL || ''
      }${originalRequest?.url} - Status: ${JSON.stringify(error.response)}`,
    );
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register');

    /* * Request Timeout * API did not respond within 30 seconds */
    if (error.code === 'ECONNABORTED') {
      Alert.alert(
        'Request Timed Out',
        'The request is taking longer than expected. Please check your internet connection and try again.',
      );
      return Promise.reject(error);
    }
    /* * No Internet / Network Error * No response received from the server */ 
    if (!error.response) {
      Alert.alert(
        'Connection Issue',
        'Unable to connect to the server. Please check your internet connection and try again.',
      );
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !isAuthRoute) {
      // If 401, clear tokens and redirect to login
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('refreshToken');
      reset('Login');
    }

    return Promise.reject(error);
  },
);
