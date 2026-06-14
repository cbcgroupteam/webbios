import { ApiClient } from '../client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName?: string;
  status: string;
  lastLoginAt: string;
  createdAt: string;
}

export class UsersModule {
  constructor(private client: ApiClient) {}

  async list(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: User[]; meta: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    
    return this.client.get(`/users?${query.toString()}`);
  }

  async getPermissions(id: string): Promise<{ data: string[] }> {
    return this.client.get(`/users/${id}/permissions`);
  }

  async create(data: any): Promise<{ success: boolean; data?: User; error?: string }> {
    return this.client.post('/users', data);
  }

  async update(id: string, data: any): Promise<{ success: boolean; error?: string }> {
    return this.client.put(`/users/${id}`, data);
  }

  async updateStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
    return this.client.put(`/users/${id}/status`, { status });
  }

  async resetPassword(id: string, data: { password?: string; sendEmail?: boolean }): Promise<{ success: boolean; error?: string }> {
    return this.client.post(`/users/${id}/reset-password`, data);
  }
}
