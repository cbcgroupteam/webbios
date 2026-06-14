export class CacheService {
  constructor(
    private kv: KVNamespace, 
    private accountId: string, 
    private apiToken: string
  ) {}

  // Ghi cache (vĩnh viễn, không TTL)
  async set(key: string, value: any): Promise<void> {
    await this.kv.put(`cache:${key}`, JSON.stringify(value));
  }

  // Lấy cache
  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(`cache:${key}`);
    return value ? JSON.parse(value) : null;
  }

  // Xóa cache trong KV và Purge CDN theo Cache-Tag
  async invalidate(key: string): Promise<void> {
    // Tầng 3: Xóa KV
    await this.kv.delete(`cache:${key}`);
    // Tầng 1+2: Purge CDN Cache bằng Cache-Tag
    await this.purgeCDN(`storefront:${key}`);
  }

  // Xóa toàn bộ cache storefront cho 1 shop
  async invalidateAll(shopDomain: string): Promise<void> {
    await this.invalidate(`theme:config:${shopDomain}`);
    await this.invalidate(`theme:css:${shopDomain}`);
    await this.purgeCDN(`storefront:${shopDomain}`);
  }

  private async purgeCDN(tag: string): Promise<void> {
    // In production, we'll call Cloudflare API to purge by tag
    // For local dev, we just log it
    console.log(`[CacheService] Purged CDN Cache-Tag: ${tag}`);
    
    // Example CF API call (requires Zone ID which we might not have locally)
    /*
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags: [tag] })
    });
    */
  }
}
