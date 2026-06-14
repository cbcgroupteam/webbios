import { Hono } from 'hono'
import { getDb } from '../../db'
import { wbAuditLogs, wbUsers } from '@webbios/db/src/schema'
import { authMiddleware } from '../../middlewares/auth'
import { eq, desc, and, gte } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const auditLogsApp = new Hono<{ Bindings: Bindings }>()

auditLogsApp.use('*', authMiddleware)

auditLogsApp.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const url = new URL(c.req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const timeFilter = url.searchParams.get('timeFilter') || 'all'
  
  const offset = (page - 1) * limit

  let conditions = undefined;
  
  if (timeFilter !== 'all') {
    const now = new Date();
    let pastDate = new Date();
    
    if (timeFilter === 'today') {
      pastDate.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'last7Days') {
      pastDate.setDate(now.getDate() - 7);
    } else if (timeFilter === 'last30Days') {
      pastDate.setDate(now.getDate() - 30);
    }
    
    conditions = gte(wbAuditLogs.createdAt, pastDate.toISOString());
  }

  const logs = await db.select({
    id: wbAuditLogs.id,
    action: wbAuditLogs.action,
    resourceType: wbAuditLogs.resourceType,
    resourceId: wbAuditLogs.resourceId,
    resourceTitle: wbAuditLogs.resourceTitle,
    changes: wbAuditLogs.changes,
    route: wbAuditLogs.route,
    method: wbAuditLogs.method,
    ipAddress: wbAuditLogs.ipAddress,
    userAgent: wbAuditLogs.userAgent,
    createdAt: wbAuditLogs.createdAt,
    userEmail: wbUsers.email,
  })
  .from(wbAuditLogs)
  .leftJoin(wbUsers, eq(wbAuditLogs.userId, wbUsers.id))
  .where(conditions)
  .orderBy(desc(wbAuditLogs.createdAt))
  .limit(limit)
  .offset(offset)

  const totalRes = await db.select({ count: wbAuditLogs.id }).from(wbAuditLogs).where(conditions)
  const total = totalRes.length

  return c.json({ data: logs, meta: { total, page, limit } })
})

export default auditLogsApp
