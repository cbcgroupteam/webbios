import { Hono } from 'hono';

// Mock types until we add them to @webbios/db
type Bindings = {
  DB: D1Database;
  CACHE_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// Lấy config của theme đang active cho domain
app.get('/:domain', async (c) => {
  const domain = c.req.param('domain');
  
  // Here we would use CacheService to try getting from KV first
  // For now we just return a mock response
  
  return c.json({
    success: true,
    data: {
      name: 'Corporate01',
      version: '1.0.0',
      // ... mock theme json
    }
  });
});

export default app;
