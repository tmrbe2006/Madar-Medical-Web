import { seedPublishedReferences } from './reference-data.js';
import { seedDemo } from './demo.js';
import { createServer as createHttpServer } from 'node:http';
import { listenWithFallback } from './listen.js';
import { spawn } from 'node:child_process';
import 'dotenv/config';
import express from 'express';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { Core } from './core.js';
const demoMode = process.env.MADAR_DEMO === 'true';
if (demoMode && resolve(process.env.DB_PATH || '') !== resolve('data/demo.db'))
    throw Error('Demo mode requires DB_PATH=data/demo.db');
const db = await openDatabase();
await db.init();
const core = new Core(db, demoMode ? '' : process.env.LOCAL_BRANCH || '');
if (!await core.one('SELECT * FROM users') && process.env.MADAR_ADMIN_PASSWORD)
    await db.transaction(() => core.setup(process.env.MADAR_ADMIN_USERNAME || 'admin', process.env.MADAR_ADMIN_PASSWORD));
if (await core.one('SELECT * FROM users'))
    await db.transaction(async () => { await core.workflow.ensure(); await core.admin.ensure(); await core.pricing.ensure(); await core.serviceWork.ensure(); await core.results.ensure(); await core.exams.ensure(); await seedPublishedReferences(core); });
if (demoMode)
    await db.transaction(async () => { await seedDemo(core); await seedPublishedReferences(core); });
const setupRequired = !await core.one('SELECT * FROM users'), setupToken = setupRequired ? randomBytes(24).toString('hex') : undefined;
const { app } = createApp(db, { localBranch: demoMode ? '' : process.env.LOCAL_BRANCH, setupToken, demoMode, secureCookies: process.env.COOKIE_SECURE === 'true' });
if (process.env.NODE_ENV === 'production') {
    app.use((_req, res, next) => { res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; worker-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"); next(); });
    app.use(express.static(resolve('dist'), { index: false, setHeaders: (res, p) => { if (p.endsWith('sw.js') || p.endsWith('index.html'))
            res.setHeader('Cache-Control', 'no-cache'); } }));
    app.get('*', (_req, res) => res.sendFile(resolve('dist/index.html')));
}
else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => { try {
        res.type('html').send(await vite.transformIndexHtml(req.originalUrl, readFileSync('index.html', 'utf8')));
    }
    catch (e) {
        next(e);
    } });
}
const args = process.argv.slice(2), arg = (key) => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : undefined; };
const port = Number(arg('--port') || process.env.PORT || 3000), host = arg('--host') || process.env.HOST || '127.0.0.1';
const http = createHttpServer(app);
const strictPort = args.includes('--strictPort') || process.env.STRICT_PORT === 'true';
const portFile = resolve(process.env.MADAR_PORT_FILE || 'data/server-port.json');
let rememberedPort;
if (!strictPort && port !== 0) {
    try {
        const cached = JSON.parse(readFileSync(portFile, 'utf8'));
        if (cached.host === host && cached.preferredPort === port)
            rememberedPort = cached.actualPort;
    }
    catch { /* No saved port on first launch. */ }
}
let actualPort;
try {
    actualPort = await listenWithFallback(http, { host, port, strictPort, rememberedPort, onRetry: (blocked, code) => console.warn(`Port ${blocked} unavailable (${code}); selecting another available port automatically.`) });
}
catch (e) {
    console.error('Cannot start Madar Medical:', e.code || 'INVALID_PORT');
    console.error('Check HOST / PORT in .env. No firewall or administrator changes were made.');
    await db.close();
    process.exit(1);
}
if (!strictPort && port !== 0) {
    try {
        mkdirSync(dirname(portFile), { recursive: true });
        writeFileSync(portFile, JSON.stringify({ host, preferredPort: port, actualPort }, null, 2));
    }
    catch {
        console.warn('Could not remember the selected port. The server is running; use the address below.');
    }
}
const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host === '::' ? '[::1]' : host.includes(':') ? `[${host}]` : host;
const url = `http://${displayHost}:${actualPort}`;
console.log(`Madar Medical Web: ${url}`);
if (process.env.MADAR_OPEN_BROWSER === '1' && process.platform === 'win32') {
    const browser = spawn('cmd.exe', ['/c', 'start', '', url], { stdio: 'ignore', windowsHide: true });
    browser.on('error', () => console.warn('Could not open the browser automatically. Open the address shown above.'));
}
if (setupToken)
    console.log(`FIRST SETUP TOKEN (use once in setup screen): ${setupToken}`);
const stop = () => { http.close(() => { void db.close().finally(() => process.exit(0)); }); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
http.on('error', () => { console.error('HTTP server error. Restart Madar Medical.'); stop(); });
