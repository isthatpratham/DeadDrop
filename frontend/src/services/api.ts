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
  const params = password ? { password } : {};
  const response = await api.get(`/download/${id}`, {
    params,
    responseType: 'blob',
    validateStatus: (status) => status < 500,
  });
  return response;
};
