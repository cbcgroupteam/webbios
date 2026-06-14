import { ApiClient } from '../client';

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceTitle?: string;
  changes?: any;
  route?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  userEmail?: string;
}

export class AuditLogsModule {
  constructor(private client: ApiClient) {}

  async list(params?: { page?: number; limit?: number; timeFilter?: string }): Promise<{ data: AuditLog[]; meta: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.timeFilter) query.append('timeFilter', params.timeFilter);
    
    return this.client.get(`/audit-logs?${query.toString()}`);
  }
}
