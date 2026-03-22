import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Helper for multipart/form-data upload
export const uploadFileAPI = async (formData: FormData) => {
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Returns a Blob or a JSON payload (if there's an error like 403 or 410)
export const downloadFileAPI = async (id: string, password?: string) => {
  const params = password ? { password } : {};
  const response = await api.get(`/download/${id}`, {
    params,
    responseType: 'blob', // Expect binary by default
    validateStatus: (status) => status < 500, // Do not throw on 4xx, we'll handle manually
  });
  return response;
};
