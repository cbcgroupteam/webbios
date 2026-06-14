import { Hono } from 'hono'
import { getDb } from '../../db'
import { wbApiKeys } from '@webbios/db/src/schema'
import { authMiddleware } from '../../middlewares/auth'
import { eq, desc } from 'drizzle-orm'
import { ulid } from 'ulid'
import { logAuditAction } from '../../utils/auditLogger'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const apiKeysApp = new Hono<{ Bindings: Bindings }>()

apiKeysApp.use('*', authMiddleware)

apiKeysApp.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const url = new URL(c.req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  
  const offset = (page - 1) * limit

  const keys = await db.select()
  .from(wbApiKeys)
  .orderBy(desc(wbApiKeys.createdAt))
  .limit(limit)
  .offset(offset)

  const totalRes = await db.select({ count: wbApiKeys.id }).from(wbApiKeys)
  const total = totalRes.length

  return c.json({ data: keys, meta: { total, page, limit } })
})

// Generate random string
function generateSecret(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Simple hash
async function hashSecret(secret: string) {
  const msgUint8 = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

apiKeysApp.post('/', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.json()
  const currentUserId = (c.get as any)('jwtPayload')?.id
  
  const id = ulid()
  const rawSecret = `wb_sk_${generateSecret(32)}`
  const secretPrefix = rawSecret.substring(0, 14)
  const secretHash = await hashSecret(rawSecret)

  const newKey = {
    id,
    name: body.name,
    secretHash,
    secretPrefix,
    scopes: body.scopes || [],
    status: 'active',
    createdBy: currentUserId,
    createdAt: new Date().toISOString()
  }

  try {
    await db.insert(wbApiKeys).values(newKey)

    await logAuditAction(c, {
      userId: currentUserId,
      action: 'create',
      resourceType: 'api_key',
      resourceId: id,
      resourceTitle: body.name,
    })
    
    // Return rawSecret ONLY ONCE
    const { secretHash: _, ...keyData } = newKey
    return c.json({ success: true, data: { ...keyData, rawSecret } })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

apiKeysApp.delete('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  const currentUserId = (c.get as any)('jwtPayload')?.id

  try {
    await db.delete(wbApiKeys).where(eq(wbApiKeys.id, id))

    await logAuditAction(c, {
      userId: currentUserId,
      action: 'delete',
      resourceType: 'api_key',
      resourceId: id,
    })
    
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default apiKeysApp
