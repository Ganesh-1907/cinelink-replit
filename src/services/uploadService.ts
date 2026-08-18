import api, {API_BASE_URL} from '../api/client';
import {storageService} from './storageService';

type UploadType = 'image' | 'video';

interface UploadResult {
  secureUrl: string;
}

async function uploadToR2(uri: string, type: UploadType): Promise<UploadResult> {
  const endpoint = type === 'image' ? '/upload/r2-image' : '/upload/r2-video';
  const formData = new FormData();

  formData.append('file', {
    uri,
    type: type === 'image' ? 'image/jpeg' : 'video/mp4',
    name: `upload.${type === 'image' ? 'jpg' : 'mp4'}`,
  } as any);

  const token = await storageService.getToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    throw new Error(`Upload server error (${response.status}): The server returned an invalid response structure.`);
  }
  if (!response.ok) throw new Error(data?.error || 'Upload failed');
  return {secureUrl: data.secureUrl};
}

export async function uploadImage(uri: string): Promise<UploadResult> {
  return uploadToR2(uri, 'image');
}

export async function uploadVideo(uri: string): Promise<UploadResult> {
  return uploadToR2(uri, 'video');
}
