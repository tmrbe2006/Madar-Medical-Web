import express from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { Mutex } from './db.js';
import { Core, RuleError, verifyPassword, text } from './core.js';
export function createApp(db, options = {}) {
    const app = express(), core = new Core(db, options.localBranch), mutex = new Mutex(), sessions = new Map(), attempts = new Map();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '4mb' }));
    app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); if (req.path.startsWith('/api/'))
        res.setHeader('Cache-Control', 'no-store'); next(); });
    const cookieName = options.demoMode ? 'madar_demo_session' : 'madar_session';
    const getSession = (req) => { const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1); return token ? { token, session: sessions.get(token) } : undefined; };
    const eq = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
    app.use('/api', (req, res, next) => {
        void mutex.use(async () => {
            try {
                if (req.method === 'GET' && req.path === '/status') {
                    res.json({ demoMode: !!options.demoMode, setupRequired: !(await core.one('SELECT * FROM users')) });
                    return;
                }
                const d = req.body;
                if (req.method === 'POST' && (!d || typeof d !== 'object' || Array.isArray(d) || !req.is('application/json')))
                    throw new RuleError('JSON object required');
                if (req.method === 'POST' && req.path === '/setup') {
                    if (!options.setupToken || !eq(text(d.token, 200), options.setupToken)) {
                        res.status(403).json({ error: 'Invalid setup token / رمز تهيئة غير صحيح' });
                        return;
                    }
                    await db.transaction(() => core.setup(text(d.username, 60), text(d.password, 200)));
                    options.setupToken = undefined;
                    res.json({ ok: true });
                    return;
                }
                if (req.method === 'POST' && req.path === '/login') {
                    const key = req.ip || 'local', recent = (attempts.get(key) || []).filter(t => t > Date.now() - 300000);
                    attempts.set(key, recent);
                    if (recent.length >= 10) {
                        res.status(429).json({ error: 'Try again in five minutes / أعد المحاولة بعد خمس دقائق' });
                        return;
                    }
                    const u = await core.one('SELECT * FROM users WHERE username=?', [text(d.username, 60).trim().toLowerCase()]);
                    if (!u || !u.active || !verifyPassword(text(d.password, 200), u.password) || u.role !== d.role || (core.localBranch && u.role !== 'admin' && !await core.admin.belongs(u, core.localBranch))) {
                        recent.push(Date.now());
                        res.status(401).json({ error: 'Incorrect username, password or role / راجع اسم المستخدم وكلمة المرور والدور' });
                        return;
                    }
                    attempts.delete(key);
                    for (const [key, value] of sessions)
                        if (value.expires < Date.now())
                            sessions.delete(key);
                    const token = randomBytes(32).toString('hex');
                    sessions.set(token, { uid: u.id, csrf: randomBytes(32).toString('hex'), expires: Date.now() + 8 * 3600000 });
                    res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: !!options.secureCookies, maxAge: 8 * 3600000, path: '/' });
                    res.json({ ok: true, branch: core.localBranch || u.branch_id || (await core.admin.access(u)).branches[0] || 'B1', role: u.role });
                    return;
                }
                const sessionRecord = getSession(req), s = sessionRecord?.session;
                if (!s || s.expires < Date.now()) {
                    res.status(401).json({ error: 'Sign in required / سجل الدخول' });
                    return;
                }
                const u = await core.one('SELECT * FROM users WHERE id=?', [s.uid]);
                if (!u?.active) {
                    res.status(401).json({ error: 'Account disabled' });
                    return;
                }
                if (req.method === 'GET' && req.path.startsWith('/attachments/')) {
                    const a = await core.attachments.read(u, req.path.slice('/attachments/'.length));
                    res.setHeader('Content-Type', a.mime);
                    res.setHeader('Content-Disposition', "inline; filename*=UTF-8''" + encodeURIComponent(a.filename));
                    res.send(Buffer.from(a.data, 'base64'));
                    return;
                }
                if (req.method === 'GET' && req.path === '/state') {
                    const branch = typeof req.query.branch === 'string' ? req.query.branch : 'B1';
                    res.json({ ...await core.snapshot(u, branch), csrf: s.csrf });
                    return;
                }
                if (req.method === 'GET' && req.path === '/users') {
                    res.json(await core.admin.users(u));
                    return;
                }
                if (req.method !== 'POST') {
                    res.status(404).json({ error: 'Not found' });
                    return;
                }
                if (!eq(req.header('X-CSRF-Token') || '', s.csrf)) {
                    res.status(403).json({ error: 'Invalid request token' });
                    return;
                }
                if (req.path === '/logout') {
                    sessions.delete(sessionRecord.token);
                    res.clearCookie(cookieName, { path: '/' });
                    res.json({ ok: true });
                    return;
                }
                if (req.path === '/quote') {
                    await core.admin.check(u, 'billing', 'view');
                    if (d.visit_id) {
                        const v = await core.one('SELECT branch_id FROM visits WHERE id=?', [text(d.visit_id, 64)]);
                        if (!v)
                            throw new RuleError('Visit missing');
                        await core.branch(u, v.branch_id);
                    }
                    res.json(await core.quote(d));
                    return;
                }
                await core.admin.route(u, '/api' + req.path, d);
                const id = req.header('Idempotency-Key') || '';
                if (!/^[\w-]{8,64}$/.test(id))
                    throw new RuleError('Idempotency key required');
                const fingerprint = createHash('sha256').update(req.path + JSON.stringify(d)).digest('hex');
                const result = await db.transaction(async () => { const cached = await core.one('SELECT * FROM requests WHERE id=?', [id]); if (cached) {
                    if (cached.user_id !== u.id || cached.fingerprint !== fingerprint)
                        throw new RuleError('Request key conflict');
                    return JSON.parse(cached.payload);
                } const result = await core.execute(u, '/api' + req.path, d); await db.insert('requests', { id, user_id: u.id, fingerprint, payload: JSON.stringify(result) }); return result; });
                res.json(result);
            }
            catch (e) {
                if (e instanceof RuleError) {
                    res.status(400).json({ error: e.message });
                }
                else {
                    console.error('API failure', e instanceof Error ? e.name : 'UnknownError');
                    res.status(500).json({ error: 'Operation failed; no changes saved / لم يتم حفظ العملية' });
                }
            }
        }).catch(next);
    });
    app.use((err, _req, res, _next) => { res.status(400).json({ error: err instanceof SyntaxError ? 'Invalid JSON' : 'Invalid request' }); });
    return { app, core, mutex };
}
