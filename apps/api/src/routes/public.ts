import { Hono } from 'hono'
import { getDb } from '../db'
import { wbSettings } from '@webbios/db/src/schema'
import { inArray } from 'drizzle-orm'

type Bindings = {
  DB: D1Database
  STORAGE: R2Bucket
}

const publicApp = new Hono<{ Bindings: Bindings }>()

// Get public settings list (used for Login page, global Storefront)
publicApp.get('/settings', async (c) => {
  const db = getDb(c.env.DB)
  
  try {
    // Only expose safe keys
    const publicKeys = ['site.language', 'site.name', 'site.logo']
    
    const settings = await db.select()
      .from(wbSettings)
      .where(inArray(wbSettings.key, publicKeys))
    
    // Format as object { "key": "value" }
    const result: Record<string, any> = {}
    for (const s of settings) {
      result[s.key] = s.value
    }
    
    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// Serve media files from R2
publicApp.get('/:folder/:file', async (c) => {
  const folder = c.req.param('folder')
  const file = c.req.param('file')
  const objectKey = `${folder}/${file}`

  try {
    const object = await c.env.STORAGE.get(objectKey)

    if (object === null) {
      return c.text('Not Found', 404)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    
    // Default Cache-Control for media
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new Response(object.body, { headers })
  } catch (error: any) {
    return c.text('Error retrieving file', 500)
  }
})

export default publicApp
