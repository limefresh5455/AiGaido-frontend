import { api } from './api';
import { WeatherRequest, WeatherResponse } from './types';

export const weatherService = {
  getWeather: async (data?: WeatherRequest): Promise<WeatherResponse> => {
    const response = await api.post<WeatherResponse>('/weather', data || {});
    return response.data;
  },
};
