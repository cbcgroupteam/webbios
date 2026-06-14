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
function Document({ children, title, themeCssUrl }: { children: React.ReactNode, title: string, themeCssUrl?: string }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        {/* We assume base Tailwind CSS is built into a public asset */}
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
    // Phase 1: MOCK Data for webbios.dev
    // Later we will read from KV cache here.
    
    const mockTheme = themeData as ThemeConfig;
    const page = mockTheme.pages[path === '' ? '/' : path];
    if (!page) {
      return c.text('Page Not Found', 404);
    }

    const stream = await renderToReadableStream(
      <Document title={page.title}>
        <SectionRenderer sections={page.sections} />
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
