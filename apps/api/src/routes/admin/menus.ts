import { Hono } from 'hono'
import { getDb } from '../../db'
import { wbMenus, wbRolePermissions, wbUsers, wbPermissions } from '@webbios/db/src/schema'
import { authMiddleware } from '../../middlewares/auth'
import { eq, asc } from 'drizzle-orm'
import { ulid } from 'ulid'

type Bindings = {
  DB: D1Database
}

const menusApp = new Hono<{ Bindings: Bindings }>()

menusApp.use('*', authMiddleware)

menusApp.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const user = c.get('user')

  if (!user || !user.sub) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // 1. Fetch user's roleId from the database
  const dbUserRecords = await db.select({ roleId: wbUsers.roleId })
    .from(wbUsers)
    .where(eq(wbUsers.id, user.sub as string))
    .limit(1)

  const dbUser = dbUserRecords[0]
  if (!dbUser) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // 2. Get all visible Menus
  const allMenusResultRaw = await db.select()
    .from(wbMenus)
    .where(eq(wbMenus.isVisible, true))
    .orderBy(asc(wbMenus.position))

  // Explicitly ensure isCategory is a boolean
  const allMenusResult = allMenusResultRaw.map(m => ({
    ...m,
    isCategory: m.isCategory === true || m.isCategory === 1 || (m as any).is_category === 1 || (m as any).is_category === true
  }))

  let allowedMenus = allMenusResult;

  if (user.role !== 'owner') {
    // Get permission slugs of current user
    const userPerms = await db.select({ slug: wbPermissions.slug })
      .from(wbRolePermissions)
      .innerJoin(wbPermissions, eq(wbRolePermissions.permissionId, wbPermissions.id))
      .where(eq(wbRolePermissions.roleId, dbUser.roleId))

    const permSlugs = userPerms.map(p => p.slug)

    // Filter Menus based on permissionSlug
    allowedMenus = allMenusResult.filter(menu => {
      if (!menu.permissionSlug) return true // No permission required
      return permSlugs.includes(menu.permissionSlug) // User has permission
    })
  }

  // 4. Build Tree
  const buildTree = (parentId: string | null): any[] => {
    return allowedMenus
      .filter(m => m.parentId === parentId)
      .map(m => ({
        ...m,
        children: buildTree(m.id)
      }))
  }

  const menuTree = buildTree(null)

  return c.json({ data: menuTree })
})

// Create Menu
menusApp.post('/', async (c) => {
  try {
    const db = getDb(c.env.DB)
    const body = await c.req.json()
    
    const newMenu = {
      ...body,
      id: body.id || ulid()
    }

    await db.insert(wbMenus).values(newMenu)
    return c.json({ success: true, data: newMenu })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Update Menu
menusApp.put('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB)
    const id = c.req.param('id')
    const body = await c.req.json()

    // Get current menu to check
    const existingRows = await db.select().from(wbMenus).where(eq(wbMenus.id, id)).limit(1)
    const existing = existingRows[0]
    if (!existing) {
      return c.json({ success: false, error: 'Menu not found' }, 404)
    }

    if (existing.isSystem) {
      // If system menu, only allow updating label, icon, translations, isVisible
      delete body.path
      delete body.permissionSlug
      delete body.parentId
      delete body.position
      delete body.isSystem
    }

    await db.update(wbMenus).set(body).where(eq(wbMenus.id, id))
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Batch Reorder Menus
menusApp.post('/reorder', async (c) => {
  const db = getDb(c.env.DB)
  const body = await c.req.json()
  const items: { id: string, parentId: string | null, position: number }[] = body.items

  if (!items || !Array.isArray(items)) {
    return c.json({ error: 'Invalid payload: items array required' }, 400)
  }

  // Get system menus to exclude from reordering
  const systemMenusRows = await db.select({ id: wbMenus.id }).from(wbMenus).where(eq(wbMenus.isSystem, true))
  const systemMenuIds = systemMenusRows.map(r => r.id)

  // Update each menu sequentially within one request
  for (const item of items) {
    if (systemMenuIds.includes(item.id)) {
      continue; // Skip updating position/parentId for system menus
    }
    await db.update(wbMenus).set({
      parentId: item.parentId,
      position: item.position
    }).where(eq(wbMenus.id, item.id))
  }

  return c.json({ success: true })
})

// Delete Menu
menusApp.delete('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')

  const existingRows = await db.select({ isSystem: wbMenus.isSystem }).from(wbMenus).where(eq(wbMenus.id, id)).limit(1)
  if (existingRows[0]?.isSystem) {
    return c.json({ success: false, error: 'Cannot delete system menu' }, 403)
  }

  await db.delete(wbMenus).where(eq(wbMenus.id, id))
  return c.json({ success: true })
})

export default menusApp
