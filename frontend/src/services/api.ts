import axios from 'axios';
import { resolveApiBaseUrl } from './apiBaseUrl';
import type { FileInfo, FileInfoResult } from './fileInfo';

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

export const getFileInfoAPI = async (id: string): Promise<FileInfoResult> => {
  const response = await api.get(`/file/${id}/info`, {
    validateStatus: (status) => status < 500,
  });

  if (response.status === 200 && response.data?.success && response.data.file) {
    return { status: 'ok', file: response.data.file as FileInfo };
  }
  if (response.status === 410) {
    return { status: 'expired' };
  }
  if (response.status === 404) {
    return { status: 'invalid' };
  }

  const message = typeof response.data?.message === 'string'
    ? response.data.message
    : 'Unable to load file information';
  return { status: 'error', message };
};
