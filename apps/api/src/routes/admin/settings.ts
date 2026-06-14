import { Hono } from 'hono'
import { Env } from '../../bindings'
import { getDb } from '../../db'
import { wbSettings } from '@webbios/db/src/schema'
import { eq, inArray } from 'drizzle-orm'
import { authMiddleware } from '../../middlewares/auth'

const settingsApp = new Hono<{ Bindings: Env }>()

settingsApp.use('*', authMiddleware)

// Lấy danh sách cấu hình
settingsApp.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const group = c.req.query('group')
  
  try {
    let query = db.select().from(wbSettings)
    if (group) {
      query = query.where(eq(wbSettings.groupName, group)) as any
    }
    
    const settings = await query.all()
    
    // Format thành dạng object { "key": "value" }
    const result: Record<string, any> = {}
    for (const s of settings) {
      result[s.key] = s.value
    }
    
    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Cập nhật cấu hình (Upsert)
settingsApp.put('/', async (c) => {
  const db = getDb(c.env.DB)
  
  try {
    const body = await c.req.json()
    // body expected: { "site.name": "WebbiOS", "site.timezone": "Asia/Ho_Chi_Minh" }
    
    const keys = Object.keys(body)
    if (keys.length === 0) return c.json({ success: true })
    
    // Xử lý từng key để upsert
    for (const key of keys) {
      const val = body[key]
      
      // Upsert logic trong SQLite Drizzle ORM
      await db.insert(wbSettings)
        .values({
          key: key,
          value: val,
          groupName: key.split('.')[0] || 'general' // ví dụ: "site" hoặc "system"
        })
        .onConflictDoUpdate({
          target: wbSettings.key,
          set: {
            value: val,
            updatedAt: new Date().toISOString()
          }
        })
        .run()
    }
    
    // Log audit
    // (Bỏ qua đoạn log chi tiết để đơn giản hóa, có thể thêm vào sau nếu cần)
    
    return c.json({ success: true, message: 'Cập nhật cấu hình thành công' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default settingsApp
