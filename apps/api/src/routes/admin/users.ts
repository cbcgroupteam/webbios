import { Hono } from 'hono'
import { getDb } from '../../db'
import { wbUsers, wbRoles, wbUserPermissions, wbSettings } from '@webbios/db/src/schema'
import { authMiddleware } from '../../middlewares/auth'
import { eq, desc, and, like } from 'drizzle-orm'
import { ulid } from 'ulid'
import { hashPassword } from '../../utils/crypto'
import { logAuditAction } from '../../utils/auditLogger'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const usersApp = new Hono<{ Bindings: Bindings }>()

usersApp.use('*', authMiddleware)

// Get all users with pagination and search
usersApp.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const url = new URL(c.req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const search = url.searchParams.get('search') || ''
  
  const offset = (page - 1) * limit

  let conditions = undefined;
  if (search) {
    conditions = like(wbUsers.email, `%${search}%`); // Simplified search
  }

  const allUsers = await db.select({
    id: wbUsers.id,
    email: wbUsers.email,
    firstName: wbUsers.firstName,
    lastName: wbUsers.lastName,
    roleId: wbUsers.roleId,
    status: wbUsers.status,
    lastLoginAt: wbUsers.lastLoginAt,
    createdAt: wbUsers.createdAt,
    roleName: wbRoles.name,
  })
  .from(wbUsers)
  .leftJoin(wbRoles, eq(wbUsers.roleId, wbRoles.id))
  .where(conditions)
  .orderBy(desc(wbUsers.createdAt))
  .limit(limit)
  .offset(offset)

  // Count total for pagination
  const totalRes = await db.select({ count: wbUsers.id }).from(wbUsers).where(conditions)
  const total = totalRes.length

  return c.json({ data: allUsers, meta: { total, page, limit } })
})

// Get permissions for a user
usersApp.get('/:id/permissions', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.req.param('id')
  
  const perms = await db.select({ permissionId: wbUserPermissions.permissionId })
    .from(wbUserPermissions)
    .where(eq(wbUserPermissions.userId, userId))
    
  return c.json({ data: perms.map(p => p.permissionId) })
})

// Create user
usersApp.post('/', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.json()
  const currentUserId = (c.get as any)('jwtPayload')?.id
  
  const userId = ulid()
  const passwordHash = await hashPassword(body.password)
  
  const newUser = {
    id: userId,
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    passwordHash,
    roleId: body.roleId,
    status: body.status || 'active',
  }

  try {
    const queries = []
    queries.push(db.insert(wbUsers).values(newUser))
    
    if (body.permissionIds && Array.isArray(body.permissionIds) && body.permissionIds.length > 0) {
      const upValues = body.permissionIds.map((pid: string) => ({
        userId,
        permissionId: pid
      }))
      queries.push(db.insert(wbUserPermissions).values(upValues))
    }
    
    await db.batch(queries as any)

    await logAuditAction(c, {
      userId: currentUserId,
      action: 'create',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: body.email,
    })
    
    // Omit password hash in response
    const { passwordHash: _ , ...userResponse } = newUser
    return c.json({ success: true, data: userResponse })
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'Email must be unique' }, 400)
    }
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Update user info and permissions
usersApp.put('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.req.param('id')
  const body = await c.req.json()
  const currentUserId = (c.get as any)('jwtPayload')?.id

  try {
    const queries = []
    
    queries.push(
      db.update(wbUsers)
        .set({
          firstName: body.firstName,
          lastName: body.lastName,
          roleId: body.roleId,
          updatedAt: new Date().toISOString()
        })
        .where(eq(wbUsers.id, userId))
    )
    
    if (body.permissionIds && Array.isArray(body.permissionIds)) {
      queries.push(db.delete(wbUserPermissions).where(eq(wbUserPermissions.userId, userId)))
      if (body.permissionIds.length > 0) {
        const upValues = body.permissionIds.map((pid: string) => ({
          userId,
          permissionId: pid
        }))
        queries.push(db.insert(wbUserPermissions).values(upValues))
      }
    }
    
    await db.batch(queries as any)

    await logAuditAction(c, {
      userId: currentUserId,
      action: 'update',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: body.email || userId,
      changes: { roleId: body.roleId, permissions: body.permissionIds }
    })
    
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Update user status (lock/unlock/archive)
usersApp.put('/:id/status', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.req.param('id')
  const body = await c.req.json()
  const currentUserId = (c.get as any)('jwtPayload')?.id

  try {
    await db.update(wbUsers)
      .set({ status: body.status, updatedAt: new Date().toISOString() })
      .where(eq(wbUsers.id, userId))

    await logAuditAction(c, {
      userId: currentUserId,
      action: 'update_status',
      resourceType: 'user',
      resourceId: userId,
      changes: { status: body.status }
    })
    
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Reset password
usersApp.post('/:id/reset-password', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.req.param('id')
  const body = await c.req.json()
  const currentUserId = (c.get as any)('jwtPayload')?.id

  try {
    const passwordHash = await hashPassword(body.password)
    
    await db.update(wbUsers)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(wbUsers.id, userId))

    if (body.sendEmail) {
      // Check SMTP config
      const smtpSettings = await db.select().from(wbSettings).where(eq(wbSettings.key, 'smtp.config'))
      if (!smtpSettings || smtpSettings.length === 0 || !smtpSettings[0].value) {
        return c.json({ success: false, error: 'SMTP_NOT_CONFIGURED' }, 400)
      }
      
      // Mock sending email
      console.log(`Sending new password to user ${userId} via SMTP...`);
    }

    await logAuditAction(c, {
      userId: currentUserId,
      action: 'reset_password',
      resourceType: 'user',
      resourceId: userId,
    })
    
    return c.json({ success: true })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default usersApp
