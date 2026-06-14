import { getDb } from '../db';
import { wbAuditLogs } from '@webbios/db/src/schema';
import { ulid } from 'ulid';

export async function logAuditAction(c: any, params: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceTitle?: string;
  changes?: any;
}) {
  try {
    const db = getDb(c.env.DB);
    
    const route = new URL(c.req.url).pathname;
    const method = c.req.method;
    
    // In Cloudflare Workers, IP is available via cf header
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    await db.insert(wbAuditLogs).values({
      id: ulid(),
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceTitle: params.resourceTitle,
      changes: params.changes ? JSON.stringify(params.changes) : undefined,
      route,
      method,
      ipAddress,
      userAgent
    });
  } catch (error) {
    // Log error but don't throw to prevent interrupting the main request
    console.error('Failed to write audit log:', error);
  }
}
