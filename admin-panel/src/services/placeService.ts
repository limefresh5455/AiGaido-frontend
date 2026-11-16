import api from './api';

export const importPlaces = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/admin/places/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return { success: true, message: 'File uploaded successfully!', data: response.data };
  } catch (error: any) {
    console.error('Upload Error:', error);
    return { success: false, message: error.response?.data?.message || 'Error uploading file.' };
  }
};
