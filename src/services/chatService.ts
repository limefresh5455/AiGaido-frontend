import { api } from './api';
import {
  AIChatStartRequest,
  AIChatResponse,
  ListTravelSessionsResponse,
  GetTravelSessionResponse,
  APIResponse,
} from './types';

export const chatService = {
  sendMessage: async (data: AIChatStartRequest): Promise<AIChatResponse> => {
    const response = await api.post<AIChatResponse>('/chat/message', data);
    return response.data;
  },

  listSessions: async (page: number = 1, pageSize: number = 20): Promise<ListTravelSessionsResponse> => {
    const response = await api.get<ListTravelSessionsResponse>('/chat/sessions', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  getSession: async (sessionId: string, page: number = 1, pageSize: number = 20): Promise<GetTravelSessionResponse> => {
    const response = await api.get<GetTravelSessionResponse>(`/chat/sessions/${sessionId}`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<APIResponse> => {
    const response = await api.delete<APIResponse>(`/chat/sessions/${sessionId}`);
    return response.data;
  },
};
