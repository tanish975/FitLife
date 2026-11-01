import { createReadStream, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Vite's preview server does not assign an APK MIME type. Serve the fixed local
// artifact explicitly so Android browsers recognize a direct download.
function apkDownload(): Plugin {
  const handler = (file: string) => (req: any, res: any, next: () => void) => {
    const path = (req.url || '').split('?')[0];
    if (!path.endsWith('/FitLife.apk') || !['GET', 'HEAD'].includes(req.method)) return next();
    try {
      const stat = statSync(file);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': String(stat.size),
        'Content-Disposition': 'attachment; filename="FitLife.apk"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(file);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch { next(); }
  };
  return {
    name: 'fitlife-apk-download',
    configureServer(server) {
      server.middlewares.use(handler(resolve(server.config.publicDir, 'FitLife.apk')));
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler(resolve(server.config.root, server.config.build.outDir, 'FitLife.apk')));
    },
  };
}

// React Fast Refresh needs an inline dev-only bootstrap and a websocket.
// Production and the signed standalone app keep the strict script policy.
function developmentCsp(): Plugin {
  return { name: 'fitlife-development-csp', apply: 'serve', transformIndexHtml(html) {
    return html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
      .replace("connect-src 'self'", "connect-src 'self' ws: wss:");
  } };
}

export default defineConfig({
  plugins: [react(), apkDownload(), developmentCsp()],
  base: './',
  build: {
    // Keep the fitness photography inside the JS bundle for the standalone HTML and Android WebView.
    assetsInlineLimit: 1024 * 1024,
  },
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 3000, allowedHosts: true },
});
