import { api } from './api';
import { 
  ComparePlacesRequest, 
  ComparePlacesResponse, 
  CompareBasicResponse, 
  CompareRecommendResponse 
} from './types';

export const comparisonService = {
  compare: async (data: ComparePlacesRequest): Promise<ComparePlacesResponse> => {
    const response = await api.post<ComparePlacesResponse>('/compare', { ...data, comparison_type: 'basic' });
    return response.data;
  },

  compareBasic: async (data: ComparePlacesRequest): Promise<CompareBasicResponse> => {
    const response = await api.post<CompareBasicResponse>('/compare', { ...data, comparison_type: 'basic' });
    return response.data;
  },

  compareRecommend: async (data: ComparePlacesRequest): Promise<CompareRecommendResponse> => {
    const response = await api.post<CompareRecommendResponse>('/compare', { ...data, comparison_type: 'recommendation' });
    return response.data;
  },

  compareBatch: async (ids: string[]): Promise<ComparePlacesResponse> => {
    const response = await api.post<ComparePlacesResponse>('/compare', { place_ids: ids, comparison_type: 'basic' });
    return response.data;
  },
};
