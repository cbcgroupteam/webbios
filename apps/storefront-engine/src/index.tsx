import { Hono } from 'hono';
import { renderToReadableStream } from 'react-dom/server.edge';
import React from 'react';
import { SectionRenderer } from '@webbios/storefront-ui';
import type { ThemeConfig } from '@webbios/storefront-ui';

import themeData from '../../../../WebbiThemes/themes/corporate01/theme.json';

export type Bindings = {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  STORAGE: R2Bucket;
  ASSETS: any; // Fetcher
};

const app = new Hono<{ Bindings: Bindings }>();

// Simple HTML Document Shell Component
function Document({ children, title, description, themeCssUrl }: { children: React.ReactNode, title: string, description?: string, themeCssUrl?: string }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {/* Preload and link base Tailwind CSS */}
        <link rel="preload" href="/styles.css" as="style" />
        <link href="/styles.css" rel="stylesheet" />
        {themeCssUrl && <link href={themeCssUrl} rel="stylesheet" />}
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}

app.get('*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname;
  const domain = url.hostname;

  try {
    // Phase 2: Read from KV cache based on domain
    let themeConfig: ThemeConfig | null = null;
    const kvData = await c.env.CACHE_KV.get(`cache:theme:config:${domain}`);
    
    if (kvData) {
      try {
        themeConfig = JSON.parse(kvData) as ThemeConfig;
      } catch (e) {
        console.error('Invalid theme JSON in KV for domain:', domain);
      }
    }
    
    // Fallback to local default if no KV config found
    if (!themeConfig) {
      console.log(`No KV config found for ${domain}. Falling back to default theme.`);
      themeConfig = themeData as ThemeConfig;
    }

    const page = themeConfig.pages[path === '' ? '/' : path] || themeConfig.pages['/'];
    if (!page) {
      return c.text('Page Not Found', 404);
    }

    const stream = await renderToReadableStream(
      <Document title={page.title} description={page.description}>
        <SectionRenderer sections={page.sections} currentPath={path} />
      </Document>,
      {
        onError(error) {
          console.error(error);
        },
      }
    );

    return new Response(stream, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300' 
      },
    });
  } catch (error) {
    console.error(error);
    return c.text('Error rendering page', 500);
  }
});

export default app;
