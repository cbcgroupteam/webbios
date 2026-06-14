import { Hono } from 'hono'
import { getDb } from '../../db'
import { wbMedia } from '@webbios/db/src/schema'
import { eq, desc, like } from 'drizzle-orm'
import { authMiddleware } from '../../middlewares/auth'
import { ulid } from 'ulid'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  STORAGE: R2Bucket
}

const mediaApp = new Hono<{ Bindings: Bindings }>()

mediaApp.use('*', authMiddleware)

mediaApp.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB)
    const { search = '', page = '1', limit = '50' } = c.req.query()
    
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const offset = (pageNum - 1) * limitNum

    let query = db.select().from(wbMedia)

    if (search) {
      query = query.where(like(wbMedia.filename, `%${search}%`)) as any
    }

    const items = await query.orderBy(desc(wbMedia.createdAt)).limit(limitNum).offset(offset)
    
    // Total count calculation could be added here if needed for pagination
    
    return c.json({ success: true, data: items })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

mediaApp.post('/upload', async (c) => {
  try {
    const userPayload = c.get('user')
    const formData = await c.req.parseBody()
    const file = formData['file'] as File

    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const fileExtension = file.name.split('.').pop()
    const isImage = file.type.startsWith('image/')
    
    // Save to UserProfiles if it's an avatar upload indicated by frontend, or Uploads by default
    const folder = formData['folder'] || 'Uploads'
    
    // We should use original filename for the DB, but unique name for R2
    const originalFilename = file.name
    const r2Key = `${folder}/${userPayload.sub}-${Date.now()}.${fileExtension}`

    // Upload to R2
    await c.env.STORAGE.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
      },
    })

    const db = getDb(c.env.DB)
    
    const url = `/${r2Key}`
    
    const mediaId = ulid()

    await db.insert(wbMedia).values({
      id: mediaId,
      filename: originalFilename,
      r2Key: r2Key,
      url: url,
      mimeType: file.type,
      size: file.size,
      uploadedBy: userPayload.sub,
    })
    
    const newMedia = await db.select().from(wbMedia).where(eq(wbMedia.id, mediaId)).limit(1)

    return c.json({ success: true, data: newMedia[0] })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

mediaApp.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const db = getDb(c.env.DB)
    
    const mediaRecord = await db.select().from(wbMedia).where(eq(wbMedia.id, id)).limit(1)
    
    if (mediaRecord.length === 0) {
      return c.json({ error: 'Media not found' }, 404)
    }
    
    const media = mediaRecord[0]
    
    // Delete from R2
    await c.env.STORAGE.delete(media.r2Key)
    
    // Delete from DB
    await db.delete(wbMedia).where(eq(wbMedia.id, id))
    
    return c.json({ success: true, message: 'Media deleted successfully' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

mediaApp.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { filename, alt } = body
    
    const db = getDb(c.env.DB)
    
    const updateData: any = {}
    if (filename !== undefined) updateData.filename = filename
    if (alt !== undefined) updateData.alt = alt
    
    if (Object.keys(updateData).length > 0) {
      await db.update(wbMedia).set(updateData).where(eq(wbMedia.id, id))
    }
    
    const updatedMedia = await db.select().from(wbMedia).where(eq(wbMedia.id, id)).limit(1)
    
    return c.json({ success: true, data: updatedMedia[0] })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

export default mediaApp
