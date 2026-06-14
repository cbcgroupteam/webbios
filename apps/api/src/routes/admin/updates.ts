import { Hono } from 'hono';
import { getDb } from '../../db';
import { sql } from 'drizzle-orm';
import { Env } from '../../bindings';

const app = new Hono<{ Bindings: Env }>();

app.post('/install', async (c) => {
  try {
    const body = await c.req.json();
    const { shopId, version, targetId, type } = body;

    if (!shopId || !version || !targetId || !type) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Call the God Platform API to enqueue the update job
    const platformApiUrl = 'https://platform.webbios.dev';
    
    // In a real production scenario, this call would include an Authorization header
    // with the Shop's License Key to verify the request on the Platform side.
    const response = await fetch(`${platformApiUrl}/api/v1/platform/shops/${shopId}/push-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        targetId,
        version,
        previousVersion: body.previousVersion
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return c.json({
        success: true,
        message: 'Update job queued successfully',
        jobId: data.jobId
      });
    } else {
      return c.json({
        success: false,
        error: data.error || 'Failed to queue update on platform'
      }, 500);
    }
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// API để WebbiPlatform trigger tự động update schema của Database D1 cho khách hàng
app.post('/upgrade-db', async (c) => {
  try {
    const db = getDb(c.env.DB);
    
    // Nâng cấp cho Webhooks (v1.0.26)
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS \`wb_webhooks\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`url\` text NOT NULL,
        \`events\` text DEFAULT '[]' NOT NULL,
        \`secret\` text,
        \`status\` text DEFAULT 'active' NOT NULL,
        \`created_at\` text DEFAULT (datetime('now')) NOT NULL,
        \`updated_at\` text DEFAULT (datetime('now')) NOT NULL
      );
    `);
    
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS \`idx_wb_webhooks_status\` ON \`wb_webhooks\` (\`status\`);
    `);

    // Cập nhật lại Menu Cài đặt (v1.0.26 / 1.0.27)
    // Biến menu Cài đặt cũ thành menu cha (path rỗng)
    await db.run(sql`
      UPDATE \`wb_menus\` 
      SET path = '' 
      WHERE label = 'Cài đặt' AND is_system = 1 AND path = '/settings';
    `);

    // Thêm các menu con (dùng INSERT OR IGNORE để tránh lỗi chạy nhiều lần)
    await db.run(sql`
      INSERT OR IGNORE INTO \`wb_menus\` (id, parent_id, label, icon, path, permission_slug, app_slug, position, is_system, translations)
      SELECT 
        'menu_sys_settings', id, 'Hệ thống', NULL, '/settings', 'settings:view', NULL, 1, 1, '{"vi":"Hệ thống","en":"System"}'
      FROM \`wb_menus\` WHERE label = 'Cài đặt' AND is_system = 1;
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO \`wb_menus\` (id, parent_id, label, icon, path, permission_slug, app_slug, position, is_system, translations)
      SELECT 
        'menu_sys_domains', id, 'Tên miền', NULL, '/settings/domains', 'settings:view', NULL, 2, 1, '{"vi":"Tên miền","en":"Domains"}'
      FROM \`wb_menus\` WHERE label = 'Cài đặt' AND is_system = 1;
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO \`wb_menus\` (id, parent_id, label, icon, path, permission_slug, app_slug, position, is_system, translations)
      SELECT 
        'menu_sys_webhooks', id, 'Webhooks', NULL, '/settings/webhooks', 'settings:view', NULL, 3, 1, '{"vi":"Webhooks","en":"Webhooks"}'
      FROM \`wb_menus\` WHERE label = 'Cài đặt' AND is_system = 1;
    `);

    // Tương lai: Thêm các scripts nâng cấp khác tại đây nếu cần

    return c.json({ success: true, message: 'Database schema upgraded successfully' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
