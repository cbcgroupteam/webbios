import { ApiClient } from '../client';

export class SettingsModule {
  constructor(private client: ApiClient) {}

  /**
   * Fetch all settings, optionally filtered by group.
   * @param group Optional group name (e.g., 'site', 'system')
   */
  async getSettings(group?: string): Promise<Record<string, any>> {
    const url = group ? `/settings?group=${group}` : `/settings`;
    const data = await this.client.get(url);
    return data.data;
  }

  /**
   * Update multiple settings via upsert.
   * @param payload Key-value pairs of settings to update
   */
  async updateSettings(payload: Record<string, any>): Promise<any> {
    const data = await this.client.put('/settings', payload);
    return data;
  }
}
