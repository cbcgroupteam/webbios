import { Hono } from 'hono';
import { Env } from '../../bindings';

const app = new Hono<{ Bindings: Env }>();

const PLATFORM_API_URL = 'https://platform.webbios.dev';

// Helper: Scan R2 to find the latest version for an app slug
async function getLatestVersionFromR2(storage: R2Bucket, appSlug: string): Promise<string | null> {
  try {
    const listed = await storage.list({ prefix: `webbios-apps/${appSlug}/webbios-app-${appSlug}-` });
    if (!listed.objects || listed.objects.length === 0) return null;

    const versions: string[] = [];
    for (const obj of listed.objects) {
      const match = obj.key.match(/webbios-app-[^/]+-v?([\d.]+)\.zip$/);
      if (match) versions.push(match[1]);
    }
    if (versions.length === 0) return null;

    // Sort semver descending
    versions.sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pb[i] || 0) - (pa[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    return versions[0]; // Return without 'v' prefix
  } catch {
    return null;
  }
}

// Get apps from marketplace (enriched with latestVersion from R2)
app.get('/apps', async (c) => {
  try {
    const res = await fetch(`${PLATFORM_API_URL}/api/v1/platform/marketplace/apps`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Platform API responded with status ${res.status}`);
    }

    const data: any = await res.json();
    const apps: any[] = data.success && data.data ? data.data : [];

    // Enrich each app with latestVersion from R2 scan
    const enriched = await Promise.all(apps.map(async (storeApp) => {
      const latestVersion = await getLatestVersionFromR2(c.env.STORAGE, storeApp.slug);
      return {
        ...storeApp,
        latestVersion: latestVersion || null,
        version: latestVersion || null,
      };
    }));

    return c.json({ success: true, data: enriched });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
