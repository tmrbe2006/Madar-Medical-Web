import { pack, now } from './core.js';
export async function demoResults(c) { if (await c.one('SELECT id FROM settings WHERE id=?', ['demo-results-v1']))
    return; if (!await c.one('SELECT id FROM settings WHERE id=?', ['demo-data-v1']))
    throw Error('Demo database required'); const admin = (await c.one('SELECT * FROM users WHERE username=?', ['demo_admin'])); for (const department of ['lab', 'radiology']) {
    const q = await c.one('SELECT q.* FROM service_requests q LEFT JOIN service_results r ON r.request_id=q.id WHERE q.department=? AND r.request_id IS NULL AND q.status<>?', [department, 'completed']);
    if (!q)
        continue;
    const author = (await c.one('SELECT * FROM users WHERE username=?', ['demo_' + department]));
    if (q.status === 'requested')
        await c.serviceWork.update(author, { id: q.id, status: 'received' });
    if (q.status !== 'in_progress')
        await c.serviceWork.update(author, { id: q.id, status: 'in_progress' });
    const result = department === 'lab' ? { rows: (await c.exams.details(q.id)).definition.rows.map((r) => ({ ...r, parameter_id: r.id, value: 'محاكاة للتدريب فقط', flag: 'unspecified' })), notes: 'ليست نتيجة فحص حقيقي' } : { findings: 'مثال لتجربة إدخال تقرير الأشعة ومراجعته وطباعته.', impression: 'محاكاة برمجية — لا يمثل فحصًا حقيقيًا', recommendations: '' };
    await c.results.save(author, { id: q.id, version: 0, operation: 'submit', result });
    await c.results.save(admin, { id: q.id, version: 1, operation: 'approve', review_note: 'اعتماد تجريبي للمحاكاة فقط' });
} await c.db.insert('settings', { id: 'demo-results-v1', payload: pack({ installed_at: now() }) }); }
