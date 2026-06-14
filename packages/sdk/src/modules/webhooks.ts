import { ApiClient } from '../client';

export class WebhooksModule {
  constructor(private client: ApiClient) {}

  async getWebhooks(): Promise<any[]> {
    const data = await this.client.get('/webhooks');
    return data.data;
  }

  async createWebhook(payload: { name: string, url: string, events: string[], secret?: string, status?: string }): Promise<any> {
    const data = await this.client.post('/webhooks', payload);
    return data;
  }

  async updateWebhook(id: string, payload: { name: string, url: string, events: string[], secret?: string, status?: string }): Promise<any> {
    const data = await this.client.put(`/webhooks/${id}`, payload);
    return data;
  }

  async deleteWebhook(id: string): Promise<any> {
    const data = await this.client.delete(`/webhooks/${id}`);
    return data;
  }
}
