import { Hono } from 'hono'
import { Env } from '../../bindings'
import { getDb } from '../../db'
import { wbWebhooks } from '@webbios/db/src/schema'
import { eq } from 'drizzle-orm'
import { authMiddleware } from '../../middlewares/auth'
import { ulid } from 'ulid'

const webhooksApp = new Hono<{ Bindings: Env }>()

webhooksApp.use('*', authMiddleware)

// Lấy danh sách Webhooks
webhooksApp.get('/', async (c) => {
  const db = getDb(c.env.DB)
  
  try {
    const webhooks = await db.select().from(wbWebhooks).all()
    return c.json({ success: true, data: webhooks })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Tạo mới Webhook
webhooksApp.post('/', async (c) => {
  const db = getDb(c.env.DB)
  
  try {
    const body = await c.req.json()
    const newWebhook = {
      id: ulid(),
      name: body.name,
      url: body.url,
      events: body.events || [],
      secret: body.secret || null,
      status: body.status || 'active'
    }
    
    await db.insert(wbWebhooks).values(newWebhook).run()
    
    return c.json({ success: true, data: newWebhook, message: 'Tạo Webhook thành công' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Cập nhật Webhook
webhooksApp.put('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  
  try {
    const body = await c.req.json()
    
    await db.update(wbWebhooks)
      .set({
        name: body.name,
        url: body.url,
        events: body.events,
        secret: body.secret,
        status: body.status,
        updatedAt: new Date().toISOString()
      })
      .where(eq(wbWebhooks.id, id))
      .run()
    
    return c.json({ success: true, message: 'Cập nhật Webhook thành công' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Xoá Webhook
webhooksApp.delete('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const id = c.req.param('id')
  
  try {
    await db.delete(wbWebhooks).where(eq(wbWebhooks.id, id)).run()
    return c.json({ success: true, message: 'Xóa Webhook thành công' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default webhooksApp
