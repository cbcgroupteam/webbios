import { ApiClient } from '../client';

export interface ApiKey {
  id: string;
  name: string;
  secretPrefix: string;
  scopes: string[];
  status: string;
  createdBy: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
  createdAt: string;
}

export class ApiKeysModule {
  constructor(private client: ApiClient) {}

  async list(params?: { page?: number; limit?: number }): Promise<{ data: ApiKey[]; meta: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    
    return this.client.get(`/api-keys?${query.toString()}`);
  }

  async create(data: { name: string; scopes?: string[] }): Promise<{ success: boolean; data?: ApiKey & { rawSecret: string }; error?: string }> {
    return this.client.post('/api-keys', data);
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    return this.client.delete(`/api-keys/${id}`);
  }
}
