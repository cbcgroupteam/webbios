import { Hono } from 'hono';
import { Env } from '../../bindings';
import { getDb } from '../../db';
import { wbInstalledApps, wbMenus } from '@webbios/db/src/schema';
import { eq } from 'drizzle-orm';

const PLATFORM_API_URL = 'https://platform.webbios.dev';

const app = new Hono<{ Bindings: Env }>();

// Helper: Fetch marketplace apps and enrich with latest version from R2
async function fetchMarketplaceApps(): Promise<any[]> {
  try {
    const res = await fetch(`${PLATFORM_API_URL}/api/v1/platform/marketplace/apps`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const apps: any[] = data.success && data.data ? data.data : [];

    return apps;
  } catch {
    return [];
  }
}

// Helper: Compare semver versions (returns true if v2 > v1)
function isNewerVersion(v1: string, v2: string): boolean {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (b > a) return true;
    if (b < a) return false;
  }
  return false;
}

// Helper: Extract shopId from the request context
function getShopId(c: any): string {
  // Try to determine shopId from the worker name or env
  // In production, the worker name follows convention: webbios-api-{shopId}
  // For now we default to WEBBIOS_PLATFORM
  return 'WEBBIOS_PLATFORM';
}

// Get installed apps (with update info)
app.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const apps = await db.select().from(wbInstalledApps);

    // Fetch marketplace apps enriched with latestVersion from R2
    const marketplaceApps = await fetchMarketplaceApps();

    const data = apps.map(app => {
      // Find corresponding marketplace app
      const marketApp = marketplaceApps.find(
        (ma: any) => ma.slug === app.slug || ma.id === app.id
      );

      // latestVersion from R2 scan (e.g. "v1.0.2"), normalize to strip leading 'v'
      const rawLatest = marketApp?.latestVersion || marketApp?.version || app.version;
      const latestVersion = rawLatest.startsWith('v') ? rawLatest.slice(1) : rawLatest;
      const hasUpdate = isNewerVersion(app.version, latestVersion);

      return {
        ...app,
        status: app.status === 'active' || app.status === 'running' ? 'running' : 'stopped',
        vendor: app.author || 'WebbiOS',
        icon: marketApp?.iconUrl || app.iconUrl || '📦',
        latestVersion,
        hasUpdate
      };
    });

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Check for updates (compare installed vs marketplace)
app.get('/check-updates', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const installedApps = await db.select().from(wbInstalledApps);
    const marketplaceApps = await fetchMarketplaceApps();

    const updates = installedApps
      .map(app => {
        const marketApp = marketplaceApps.find(
          (ma: any) => ma.slug === app.slug || ma.id === app.id
        );
        if (!marketApp) return null;

        const rawLatest = marketApp.latestVersion || marketApp.version || app.version;
        const latestVersion = rawLatest.startsWith('v') ? rawLatest.slice(1) : rawLatest;
        if (!isNewerVersion(app.version, latestVersion)) return null;

        return {
          id: app.id,
          slug: app.slug,
          name: app.name,
          currentVersion: app.version,
          latestVersion,
          changelog: marketApp.changelog || null
        };
      })
      .filter(Boolean);

    return c.json({ success: true, data: updates });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Uninstall app (also deletes Cloudflare Pages project & menus)
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = getDb(c.env.DB);

    // 1. Get app info before deleting
    const [appInfo] = await db.select().from(wbInstalledApps).where(eq(wbInstalledApps.id, id));

    if (!appInfo) {
      return c.json({ success: false, error: 'App not found' }, 404);
    }

    // 2. Try to delete Cloudflare Pages project
    const cfToken = c.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = c.env.CLOUDFLARE_ACCOUNT_ID;

    if (cfToken && cfAccountId && appInfo.workerUrl) {
      try {
        // Extract Pages project name from workerUrl
        // URL format: https://wb-app-crm-wbshop9050.pages.dev
        const urlObj = new URL(appInfo.workerUrl);
        const hostname = urlObj.hostname; // wb-app-crm-wbshop9050.pages.dev
        const projectName = hostname.split('.')[0]; // wb-app-crm-wbshop9050

        if (projectName) {
          console.log(`Deleting Cloudflare Pages project: ${projectName}`);

          const deleteRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${projectName}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${cfToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const deleteData: any = await deleteRes.json();
          if (!deleteRes.ok) {
            console.warn(`Failed to delete Pages project ${projectName}:`, deleteData);
            // Don't block uninstall if CF deletion fails
          } else {
            console.log(`✅ Deleted Cloudflare Pages project: ${projectName}`);
          }
        }
      } catch (cfErr) {
        console.warn('Failed to delete Cloudflare Pages project:', cfErr);
        // Continue with local uninstall even if CF cleanup fails
      }
    }

    // 3. Delete related menus
    if (appInfo.slug) {
      await db.delete(wbMenus).where(eq(wbMenus.appSlug, appInfo.slug));
    }

    // 4. Delete app record
    await db.delete(wbInstalledApps).where(eq(wbInstalledApps.id, id));

    return c.json({ success: true, message: 'App uninstalled and Cloudflare resources cleaned up' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/install', async (c) => {
  try {
    const body = await c.req.json();
    const { shopId, version, targetId } = body;

    if (!shopId || !version || !targetId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const db = getDb(c.env.DB);
    const cfToken = c.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = c.env.CLOUDFLARE_ACCOUNT_ID;

    // 1. Verify the zip exists in R2 (using R2 binding)
    // Normalize version: strip 'v' to support standard format webbios-apps-crm-1.0.4.zip
    const versionNorm = version.startsWith('v') ? version.substring(1) : version;
    const zipKey = `webbios-apps/${targetId}/webbios-apps-${targetId}-${versionNorm}.zip`;
    let zipExists = false;
    try {
      const r2Obj = await c.env.STORAGE.head(zipKey);
      zipExists = r2Obj !== null;
    } catch {
      zipExists = false;
    }

    if (!zipExists) {
      return c.json({
        success: false,
        error: `Version ${version} of app ${targetId} has not been uploaded to the repository. Expected file: ${zipKey}`
      }, 400);
    }

    // 2. Determine the Pages project name and workerUrl
    const safeShopId = shopId.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const projectName = `wb-app-${targetId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${safeShopId}`;
    const workerUrl = `https://${projectName}.pages.dev`;

    // 3. Ensure Cloudflare Pages project exists
    if (cfToken && cfAccountId) {
      try {
        const checkRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${projectName}`,
          { headers: { 'Authorization': `Bearer ${cfToken}` } }
        );
        if (!checkRes.ok) {
          // Project doesn't exist, create it
          console.log(`Creating Pages project: ${projectName}`);
          const createRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: projectName, production_branch: 'main' })
            }
          );
          const createData: any = await createRes.json();
          if (!createRes.ok) {
            console.warn(`Warning: Could not create Pages project ${projectName}:`, createData);
          } else {
            console.log(`✅ Created Pages project: ${projectName}`);
          }
        }
      } catch (cfErr) {
        console.warn('CF Pages check/create warning:', cfErr);
      }
    }

    // 4. Insert or update app record in DB immediately
    const appMetadata = getAppMetadata(targetId, version, shopId);

    await db.insert(wbInstalledApps).values(appMetadata).onConflictDoUpdate({
      target: wbInstalledApps.id,
      set: { workerUrl: appMetadata.workerUrl, version: appMetadata.version, status: 'installing' }
    });

    // 5. Add menus for known apps
    await insertAppMenus(db, targetId);

    // 6. Fire-and-forget: queue deploy job on platform (background)
    // This will trigger the actual deployment of zip to CF Pages
    let jobId: string | null = null;
    try {
      const platformRes = await fetch(`${PLATFORM_API_URL}/api/v1/platform/shops/${shopId}/push-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'app', targetId, version, previousVersion: null })
      });
      const platformData: any = await platformRes.json().catch(() => ({}));
      if (platformRes.ok && platformData.success) {
        jobId = platformData.jobId;
        // Update status to queued
        await db.update(wbInstalledApps).set({ status: 'active' }).where(eq(wbInstalledApps.id, appMetadata.id));
      }
    } catch (platformErr) {
      console.warn('Platform queue warning (non-blocking):', platformErr);
      // Don't fail install if platform is unavailable
      await db.update(wbInstalledApps).set({ status: 'active' }).where(eq(wbInstalledApps.id, appMetadata.id));
    }

    return c.json({
      success: true,
      message: 'App installed successfully',
      workerUrl,
      jobId
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// Helper: get standardized app metadata
function getAppMetadata(targetId: string, version: string, shopId: string) {
  const safeShopId = shopId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const projectName = `wb-app-${targetId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${safeShopId}`;
  const workerUrl = `https://${projectName}.pages.dev`;

  const metadata: Record<string, { name: string; description: string; iconUrl: string; author: string }> = {
    crm: {
      name: 'WebbiOS CRM',
      description: 'Manage customers, orders, products, inventory, reports...',
      iconUrl: 'ShoppingCart',
      author: 'Webbi'
    }
  };

  const meta = metadata[targetId] || {
    name: `WebbiOS ${targetId.toUpperCase()}`,
    description: `App ${targetId} v${version}`,
    iconUrl: 'Box',
    author: 'Webbi'
  };

  return {
    id: `app_${targetId}`,
    slug: targetId,
    name: meta.name,
    version,
    type: 'app',
    author: meta.author,
    description: meta.description,
    iconUrl: meta.iconUrl,
    workerUrl,
    status: 'installing',
  };
}

// Helper: insert menus for known apps
async function insertAppMenus(db: any, targetId: string) {
  if (targetId === 'crm') {
    const crmMenuId = 'menu_app_crm_root';
    await db.insert(wbMenus).values({
      id: crmMenuId,
      label: 'CRM',
      icon: null,
      path: '',
      appSlug: 'crm',
      position: 5,
      isSystem: false,
      isCategory: true,
      translations: '{"en":"CRM","en-US":"CRM","en-GB":"CRM","vi":"CRM","es":"CRM","fr":"CRM","de":"CRM","id":"CRM","th":"CRM","zh-CN":"CRM","zh-TW":"CRM","ja":"CRM","ko":"CRM"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_crm_orders',
      parentId: crmMenuId,
      label: 'Orders',
      icon: 'ShoppingCart',
      path: '/apps/crm/orders',
      appSlug: 'crm',
      position: 1,
      isSystem: false,
      translations: '{"en":"Orders","en-US":"Orders","en-GB":"Orders","vi":"Đơn hàng","es":"Pedidos","fr":"Commandes","de":"Bestellungen","id":"Pesanan","th":"คำสั่งซื้อ","zh-CN":"订单","zh-TW":"訂單","ja":"注文","ko":"주문"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_crm_customers',
      parentId: crmMenuId,
      label: 'Customers',
      icon: 'Users',
      path: '/apps/crm/customers',
      appSlug: 'crm',
      position: 2,
      isSystem: false,
      translations: '{"en":"Customers","en-US":"Customers","en-GB":"Customers","vi":"Khách hàng","es":"Clientes","fr":"Clients","de":"Kunden","id":"Pelanggan","th":"ลูกค้า","zh-CN":"客户","zh-TW":"客戶","ja":"顧客","ko":"고객"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_crm_reports',
      parentId: crmMenuId,
      label: 'Reports',
      icon: 'BarChart3',
      path: '/apps/crm/reports',
      appSlug: 'crm',
      position: 7,
      isSystem: false,
      translations: '{"en":"Reports","en-US":"Reports","en-GB":"Reports","vi":"Báo cáo","es":"Informes","fr":"Rapports","de":"Berichte","id":"Laporan","th":"รายงาน","zh-CN":"报告","zh-TW":"報告","ja":"レポート","ko":"보고서"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_crm_products',
      parentId: crmMenuId,
      label: 'Products',
      icon: 'Package',
      path: '/apps/crm/products',
      appSlug: 'crm',
      position: 3,
      isSystem: false,
      translations: '{"en":"Products","en-US":"Products","en-GB":"Products","vi":"Sản phẩm","es":"Productos","fr":"Produits","de":"Produkte","id":"Produk","th":"สินค้า","zh-CN":"产品","zh-TW":"產品","ja":"製品","ko":"제품"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_crm_inventory',
      parentId: crmMenuId,
      label: 'Inventory',
      icon: 'Warehouse',
      path: '/apps/crm/inventory',
      appSlug: 'crm',
      position: 4,
      isSystem: false,
      translations: '{"en":"Inventory","en-US":"Inventory","en-GB":"Inventory","vi":"Kho hàng","es":"Inventario","fr":"Inventaire","de":"Inventar","id":"Inventaris","th":"สินค้าคงคลัง","zh-CN":"库存","zh-TW":"庫存","ja":"在庫","ko":"재고"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_crm_purchase_orders',
      parentId: crmMenuId,
      label: 'Purchase Orders',
      icon: 'ClipboardList',
      path: '/apps/crm/purchase_orders',
      appSlug: 'crm',
      position: 5,
      isSystem: false,
      translations: '{"en":"Purchase Orders","en-US":"Purchase Orders","en-GB":"Purchase Orders","vi":"Nhập hàng","es":"Órdenes de Compra","fr":"Bons de Commande","de":"Bestellungen","id":"Pesanan Pembelian","th":"ใบสั่งซื้อ","zh-CN":"采购订单","zh-TW":"採購訂單","ja":"発注書","ko":"구매 주문"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_crm_suppliers',
      parentId: crmMenuId,
      label: 'Suppliers',
      icon: 'Truck',
      path: '/apps/crm/suppliers',
      appSlug: 'crm',
      position: 6,
      isSystem: false,
      translations: '{"en":"Suppliers","en-US":"Suppliers","en-GB":"Suppliers","vi":"Nhà cung cấp","es":"Proveedores","fr":"Fournisseurs","de":"Lieferanten","id":"Pemasok","th":"ซัพพลายเออร์","zh-CN":"供应商","zh-TW":"供應商","ja":"サプライヤー","ko":"공급업체"}'
    }).onConflictDoNothing();
  } else if (targetId === 'theme-manager') {
    // Thêm Root menu cho Theme Manager
    const themeMenuId = 'menu_app_theme_manager_root';
    await db.insert(wbMenus).values({
      id: themeMenuId,
      label: 'Theme Manager',
      icon: null,
      path: '',
      appSlug: 'theme-manager',
      position: 6,
      isSystem: false,
      isCategory: true,
      translations: '{"en":"Theme Manager","vi":"Quản lý Giao diện"}'
    }).onConflictDoNothing();

    await db.insert(wbMenus).values({
      id: 'menu_app_theme_manager_themes',
      parentId: themeMenuId,
      label: 'Themes',
      icon: 'Palette',
      path: '/apps/theme-manager',
      appSlug: 'theme-manager',
      position: 1,
      isSystem: false,
      isCategory: false,
      translations: '{"en":"Themes","vi":"Giao diện"}'
    }).onConflictDoNothing();
  }
}



app.post('/update', async (c) => {
  try {
    const body = await c.req.json();
    const { shopId, version, targetId } = body;

    if (!shopId || !version || !targetId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const db = getDb(c.env.DB);

    // 1. Verify the new version zip exists in R2
    // Normalize version: strip 'v' to support standard format webbios-apps-crm-1.0.4.zip
    const versionNorm = version.startsWith('v') ? version.substring(1) : version;
    const zipKey = `webbios-apps/${targetId}/webbios-apps-${targetId}-${versionNorm}.zip`;
    let zipExists = false;
    try {
      const r2Obj = await c.env.STORAGE.head(zipKey);
      zipExists = r2Obj !== null;
    } catch {
      zipExists = false;
    }

    if (!zipExists) {
      return c.json({
        success: false,
        error: `Version ${version} of app ${targetId} has not been uploaded to the repository. Expected file: ${zipKey}`
      }, 400);
    }

    // 2. Update the version in installed apps DB immediately
    await db.update(wbInstalledApps)
      .set({ version, status: 'updating' })
      .where(eq(wbInstalledApps.slug, targetId));

    // 3. Fire-and-forget: queue platform deploy job (background)
    let jobId: string | null = null;
    try {
      const platformRes = await fetch(`${PLATFORM_API_URL}/api/v1/platform/shops/${shopId}/push-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'app', targetId, version, previousVersion: null })
      });
      const platformData: any = await platformRes.json().catch(() => ({}));
      if (platformRes.ok && platformData.success) {
        jobId = platformData.jobId;
      }
    } catch (platformErr) {
      console.warn('Platform queue warning (non-blocking):', platformErr);
    }

    // 4. Update status to active (update is "applied" to DB; Pages deploy happens in background)
    await db.update(wbInstalledApps).set({ status: 'active' }).where(eq(wbInstalledApps.slug, targetId));

    return c.json({
      success: true,
      message: 'App update applied successfully',
      jobId
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
