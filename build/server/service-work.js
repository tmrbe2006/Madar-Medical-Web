import { ageYears } from '../shared/workflow.js';
import { RuleError, text, uid, now, pack } from './core.js';
export class ServiceWork {
    c;
    constructor(c) {
        this.c = c;
    }
    async ensure() { if (await this.c.one('SELECT id FROM settings WHERE id=?', ['service-work-v1']))
        return; for (const v of await this.c.db.all('SELECT * FROM visits'))
        await this.create(v); await this.c.db.insert('settings', { id: 'service-work-v1', payload: pack({ installed_at: now() }) }); }
    async create(v) { const n = JSON.parse(v.payload); for (const [department, orders] of [['lab', n.lab_orders || []], ['radiology', n.radiology_orders || []]])
        for (const x of orders) {
            if (await this.c.one('SELECT id FROM service_requests WHERE visit_id=? AND department=? AND catalog_id=?', [v.id, department, x.id]))
                continue;
            await this.c.db.insert('service_requests', { id: uid(), visit_id: v.id, branch_id: v.branch_id, patient_id: v.patient_id, department, catalog_id: x.id, name: x.name, status: 'requested', created_at: v.created_at, updated_at: now() });
            const saved = await this.c.one('SELECT * FROM service_requests WHERE visit_id=? AND department=? AND catalog_id=?', [v.id, department, x.id]);
            if (saved)
                await this.c.exams.capture(saved);
        } }
    async list(u, b) { const a = await this.c.admin.access(u), results = new Map((await this.c.db.all('SELECT r.* FROM service_results r JOIN service_requests q ON q.id=r.request_id WHERE q.branch_id=?', [b])).map(r => [r.request_id, r])); const details = new Map((await this.c.db.all('SELECT d.id,d.payload FROM request_details d JOIN service_requests q ON q.id=d.id WHERE q.branch_id=?', [b])).map(d => [d.id, JSON.parse(d.payload)])); const attachments = await this.c.db.all('SELECT a.id,a.request_id,a.filename,a.mime,a.bytes FROM result_attachments a JOIN service_requests q ON q.id=a.request_id WHERE q.branch_id=? AND a.active=?', [b, 1]); const ages = new Map((await this.c.db.all('SELECT id,birth_date FROM patients')).map(p => [p.id, ageYears(p.birth_date)])); const metadata = new Map((await this.c.db.all('SELECT l.visit_id,l.details FROM visit_links l JOIN visits v ON v.id=l.visit_id WHERE v.branch_id=?', [b])).map(l => [l.visit_id, JSON.parse(l.details)])); const own = new Set(u.role === 'doctor' ? (await this.c.db.all('SELECT id FROM visits WHERE branch_id=? AND doctor_id=?', [b, u.id])).map(v => v.id) : []); return (await this.c.db.all('SELECT * FROM service_requests WHERE branch_id=? ORDER BY created_at DESC', [b])).filter(x => (a.permissions['external-services'].view && details.get(x.id)?.source === 'external') || a.permissions[x.department === 'lab' ? 'lab-work' : 'radiology-work']?.view || (own.has(x.visit_id) && results.get(x.id)?.status === 'approved')).map(x => ({ ...x, patient_age_years: ages.get(x.patient_id) ?? null, details: details.get(x.id), attachments: a.permissions[x.department === 'lab' ? 'lab-work' : 'radiology-work'].view || own.has(x.visit_id) ? attachments.filter(a => a.request_id === x.id) : [], result: (a.permissions[x.department === 'lab' ? 'lab-work' : 'radiology-work'].view || own.has(x.visit_id)) ? results.get(x.id) : undefined, clinic_name: metadata.get(x.visit_id)?.clinic_name, doctor_name: metadata.get(x.visit_id)?.doctor_name })); }
    async update(u, d) { const q = await this.c.one('SELECT * FROM service_requests WHERE id=?', [text(d.id, 64)]); if (!q)
        throw new RuleError('Request missing'); await this.c.branch(u, q.branch_id); await this.c.admin.check(u, q.department === 'lab' ? 'lab-work' : 'radiology-work', 'edit'); const next = q.status === 'requested' ? 'received' : q.status === 'received' ? 'in_progress' : ''; if (d.status !== next || !next)
        throw new RuleError('Invalid request transition / انتقال حالة غير مسموح'); await this.c.db.run('UPDATE service_requests SET status=?,updated_at=? WHERE id=?', [next, now(), q.id]); await this.c.audit(u, 'SERVICE_REQUEST_' + next.toUpperCase(), q.id, q.branch_id); return { ...q, status: next }; }
}
