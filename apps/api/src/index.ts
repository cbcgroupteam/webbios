import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { seed } from '@webbios/db/src/seed'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  STORAGE: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

app.get('/', (c) => {
  return c.json({
    name: 'WebbiOS Core API',
    version: '2.0.0',
    architecture: '4-Layer',
    status: 'online'
  })
})

app.post('/seed', async (c) => {
  try {
    await seed(c.env)
    return c.json({ success: true, message: 'Core Kernel database seeded successfully' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

import { getDb } from './db'
import { wbUsers, wbRoles } from '@webbios/db/src/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from './utils/crypto'
import { ulid } from 'ulid'

app.post('/setup-owner', async (c) => {
  try {
    const db = getDb(c.env.DB)
    const ownerRole = await db.select().from(wbRoles).where(eq(wbRoles.slug, 'owner')).limit(1)
    if (ownerRole.length === 0) return c.json({ error: 'Owner role not found. Run /seed first.' }, 404)

    const existingUser = await db.select().from(wbUsers).where(eq(wbUsers.email, 'admin@webbios.local')).limit(1)
    if (existingUser.length > 0) return c.json({ error: 'Owner already exists' }, 400)

    const pwdHash = await hashPassword('Admin@123')
    await db.insert(wbUsers).values({
      id: ulid(),
      email: 'admin@webbios.local',
      passwordHash: pwdHash,
      firstName: 'System',
      lastName: 'Admin',
      roleId: ownerRole[0].id,
      status: 'active',
    })
    return c.json({ success: true, message: 'Owner created: admin@webbios.local / Admin@123' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

import authApp from './routes/admin/auth'
import dashboardApp from './routes/admin/dashboard'
import menusApp from './routes/admin/menus'
import permissionsApp from './routes/admin/permissions'
import rolesApp from './routes/admin/roles'
import updatesApp from './routes/admin/updates'
import settingsApp from './routes/admin/settings'
import webhooksApp from './routes/admin/webhooks'
import mediaApp from './routes/admin/media'
import marketplaceApp from './routes/admin/marketplace'
import appsApp from './routes/admin/apps'
import usersApp from './routes/admin/users'
import auditLogsApp from './routes/admin/audit_logs'
import apiKeysApp from './routes/admin/api_keys'
import storefrontConfigApp from './routes/storefront/config'

app.route('/v1/admin/auth', authApp)
app.route('/v1/admin/dashboard', dashboardApp)
app.route('/v1/admin/menus', menusApp)
app.route('/v1/admin/permissions', permissionsApp)
app.route('/v1/admin/roles', rolesApp)
app.route('/v1/admin/updates', updatesApp)
app.route('/v1/admin/settings', settingsApp)
app.route('/v1/admin/webhooks', webhooksApp)
app.route('/v1/admin/media', mediaApp)
app.route('/v1/admin/marketplace', marketplaceApp)
app.route('/v1/admin/apps', appsApp)
app.route('/v1/admin/users', usersApp)
app.route('/v1/admin/audit-logs', auditLogsApp)
app.route('/v1/admin/api-keys', apiKeysApp)

// Storefront routes
app.route('/v1/storefront/config', storefrontConfigApp)

export default app
