import axios from 'axios';
import { resolveApiBaseUrl } from './apiBaseUrl';

const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
});

export const uploadFileAPI = async (formData: FormData) => {
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const downloadFileAPI = async (id: string, password?: string) => {
  const requestConfig = {
    responseType: 'blob' as const,
    validateStatus: (status: number) => status < 500,
  };

  if (password) {
    return api.post(`/download/${id}`, { password }, requestConfig);
  }

  return api.get(`/download/${id}`, requestConfig);
};
