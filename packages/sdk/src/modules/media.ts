import { ApiClient } from '../client';

export interface MediaRecord {
  id: string;
  filename: string;
  r2Key: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  uploadedBy: string;
  createdAt: string;
}

export class MediaModule {
  constructor(private client: ApiClient) {}

  /**
   * Retrieves a paginated list of media files.
   */
  async list(params?: { page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    
    return this.client.get(`/media?${query.toString()}`);
  }

  /**
   * Uploads a new media file.
   */
  async upload(file: File, folder?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    
    return this.client.post('/media/upload', formData);
  }

  /**
   * Updates metadata of a media file.
   */
  async update(id: string, data: { filename?: string; alt?: string }) {
    return this.client.put(`/media/${id}`, data);
  }

  /**
   * Deletes a media file.
   */
  async delete(id: string) {
    return this.client.delete(`/media/${id}`);
  }
}
