import { RuleError, text, cents, pack, now } from './core.js';
export class Pricing {
    c;
    constructor(c) {
        this.c = c;
    }
    async ensure() { if (!await this.c.one('SELECT id FROM settings WHERE id=?', ['pricing-v1']))
        await this.c.db.insert('settings', { id: 'pricing-v1', payload: pack({ installed_at: now() }) }); }
    async save(u, d) {
        await this.c.admin.check(u, 'clinics', 'edit');
        const assignment_id = text(d.assignment_id, 64), a = await this.c.one('SELECT * FROM doctor_assignments WHERE id=?', [assignment_id]);
        if (!a?.active)
            throw new RuleError('Choose active doctor assignment');
        await this.c.branch(u, a.branch_id);
        if (!Array.isArray(d.rates) || d.rates.length > 4)
            throw new RuleError('Invalid tariffs');
        const seen = new Set(), rates = [];
        for (const raw of d.rates) {
            if (!raw || typeof raw !== 'object')
                throw new RuleError('Invalid tariff');
            const r = raw, visit_type = text(r.visit_type, 30), service_id = text(r.service_id, 64);
            if (!['consultation', 'advice', 'followup', 'other'].includes(visit_type) || seen.has(visit_type))
                throw new RuleError('Invalid or duplicate visit type');
            seen.add(visit_type);
            const s = await this.c.one('SELECT s.*,m.active FROM services s JOIN service_details m ON m.id=s.id WHERE s.id=?', [service_id]);
            if (!s || s.active === 0 || !['clinic', 'procedure'].includes(s.category))
                throw new RuleError('Choose an active clinic or procedure service / اختر خدمة عيادات أو إجراء طبي');
            const price = cents(r.price), doctor_bp = cents(r.doctor_percent);
            if (doctor_bp > 10000)
                throw new RuleError('Doctor percentage must be 0–100');
            rates.push({ id: assignment_id + ':' + visit_type, assignment_id, visit_type: visit_type, service_id, price, doctor_bp });
        }
        await this.c.db.run('DELETE FROM appointment_tariffs WHERE assignment_id=?', [assignment_id]);
        for (const r of rates)
            await this.c.db.insert('appointment_tariffs', r);
        await this.c.audit(u, 'UPDATE_DOCTOR_CLINIC_PRICES', a.id, a.branch_id);
        return rates;
    }
    async selected(assignment_id, type) { return this.c.one('SELECT * FROM appointment_tariffs WHERE assignment_id=? AND visit_type=?', [assignment_id, type]); }
    async visit(visit_id) { const link = await this.c.one('SELECT details FROM visit_links WHERE visit_id=?', [visit_id]); return link ? JSON.parse(link.details) : undefined; }
}
