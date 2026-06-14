export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  STORAGE: R2Bucket;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}
