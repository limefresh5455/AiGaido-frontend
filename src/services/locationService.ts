import { api } from './api';
import {
  GPSUpdateRequest,
  APIResponse,
} from './types';

export const locationService = {
  getMyLocation: async (): Promise<APIResponse> => {
    const response = await api.get<APIResponse>('/locations/me');
    return response.data;
  },

  updateGps: async (data: GPSUpdateRequest): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/locations/gps', data);
    return response.data;
  },

  reverseGeocode: async (latitude: number, longitude: number, language_code: string = 'en'): Promise<any> => {
    const response = await api.post<any>('/locations/reverse-geocode', {
      latitude,
      longitude,
      language_code,
    });
    return response.data;
  },



  getHistory: async (page: number = 1, pageSize: number = 20): Promise<APIResponse> => {
    const response = await api.get<APIResponse>('/locations/history', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  getLatest: async (): Promise<APIResponse> => {
    const response = await api.get<APIResponse>('/locations/latest');
    return response.data;
  },

  deleteHistoryEntry: async (historyId: number): Promise<APIResponse> => {
    const response = await api.delete<APIResponse>(`/locations/delete?history_id=${historyId}`);
    return response.data;
  },
};
