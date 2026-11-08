import { seedPublishedReferences } from './reference-data.js';
import { Exams } from './exams.js';
import { Attachments } from './attachments.js';
import { Results } from './results.js';
import { ServiceWork } from './service-work.js';
import { saveAccount } from './accounts.js';
import { Pricing } from './pricing.js';
import { Administration } from './admin.js';
import { Workflow } from './workflow.js';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export class RuleError extends Error {
}
export const roles = ['admin', 'doctor', 'accountant', 'reception', 'pharmacist', 'lab', 'radiology', 'nurse', 'hr'];
export const businessDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const uid = () => randomUUID(), now = () => new Date().toISOString(), pack = (v) => JSON.stringify(v);
export function text(v, max = 12000) { return typeof v === 'string' ? v.slice(0, max) : ''; }
export function cents(v) { const str = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : ''; if (!/^\d+(\.\d{1,6})?$/.test(str))
    throw new RuleError('Invalid amount / مبلغ غير صالح'); const [whole, frac = ''] = str.split('.'); if (BigInt(whole) > 100000000n)
    throw new RuleError('Amount too large'); const n = Number(BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2)) + (Number(frac[2] || '0') >= 5 ? 1n : 0n)); if (!Number.isSafeInteger(n))
    throw new RuleError('Invalid amount'); return n; }
export function portion(value, bp) { return Number((BigInt(value) * BigInt(bp) + 5000n) / 10000n); }
export function hashPassword(p) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(p, salt, 64).toString('hex'); }
export function verifyPassword(p, h) { try {
    const [salt, digest] = h.split(':');
    const got = scryptSync(p, salt, 64);
    const expected = Buffer.from(digest, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
}
catch {
    return false;
} }
const seedAccounts = [['1100', 'الخزينة / Cash', 'asset'], ['1200', 'مدينون مرضى / Patients receivable', 'asset'], ['1210', 'مدينون تأمين / Insurance receivable', 'asset'], ['1300', 'مخزون / Inventory', 'asset'], ['1500', 'أصول ثابتة / Fixed assets', 'asset'], ['2100', 'موردون / Suppliers payable', 'liability'], ['2200', 'مستحقات أطباء / Doctors payable', 'liability'], ['2300', 'رواتب مستحقة / Payroll payable', 'liability'], ['3000', 'رأس المال / Capital', 'equity'], ['4000', 'إيراد خدمات / Service revenue', 'revenue'], ['4090', 'خصومات إضافية / Discounts', 'contra_revenue'], ['5000', 'تكلفة مبيعات / Cost of sales', 'expense'], ['5100', 'أتعاب أطباء / Doctor fees', 'expense'], ['5200', 'مصروفات تشغيل / Operating expenses', 'expense']];
export class Core {
    db;
    localBranch;
    workflow;
    admin;
    pricing;
    serviceWork;
    results;
    exams;
    attachments;
    constructor(db, localBranch = '') {
        this.db = db;
        this.localBranch = localBranch;
        this.workflow = new Workflow(this);
        this.admin = new Administration(this);
        this.pricing = new Pricing(this);
        this.serviceWork = new ServiceWork(this);
        this.results = new Results(this);
        this.exams = new Exams(this);
        this.attachments = new Attachments(this);
    }
    async one(sql, args = []) { return (await this.db.all(sql, args))[0]; }
    async setup(username, password) {
        username = username.trim().toLowerCase();
        if (await this.one('SELECT * FROM users'))
            throw new RuleError('Already initialized');
        if (!/^[a-zA-Z0-9_.-]{3,60}$/.test(username) || password.length < 4)
            throw new RuleError('Username 3–60 characters; password 4+ / اسم مستخدم ٣ أحرف وكلمة مرور ٤ على الأقل');
        for (let n = 1; n <= 4; n++)
            await this.db.insert('branches', { id: `B${n}`, name: `الفرع ${n} / Branch ${n}`, company: 'شركة تجريبية / Demo company' });
        const u = { id: uid(), username, password: hashPassword(password), role: 'admin', branch_id: '', active: 1 };
        await this.db.insert('users', u);
        for (const [id, name, category] of [['1', 'الأصول / Assets', 'asset'], ['2', 'الالتزامات / Liabilities', 'liability'], ['3', 'حقوق الملكية / Equity', 'equity'], ['4', 'الإيرادات / Revenue', 'revenue'], ['5', 'المصروفات / Expenses', 'expense']])
            await this.db.insert('accounts', { id, name, category, parent_id: '', postable: 0 });
        for (const [id, name, category] of seedAccounts)
            await this.db.insert('accounts', { id, name, category, parent_id: id[0], postable: 1 });
        for (const s of [{ id: 'S1', name: 'كشف / Consultation', category: 'clinic', price: 50000, doctor_bp: 3000 }, { id: 'S2', name: 'متابعة / Follow-up', category: 'clinic', price: 25000, doctor_bp: 3000 }, { id: 'S3', name: 'صورة دم / CBC', category: 'lab', price: 20000, doctor_bp: 0 }, { id: 'S4', name: 'أشعة صدر / Chest X-ray', category: 'radiology', price: 35000, doctor_bp: 1000 }, { id: 'S5', name: 'إجراء طبي / Procedure', category: 'procedure', price: 100000, doctor_bp: 3500 }])
            await this.db.insert('services', s);
        for (const [id, name, rates] of [['P1', 'شركة أ — خطة تجريبية / Plan A', { S1: [30000, 2000], S2: [18000, 2000], S3: [15000, 1000], S4: [25000, 2000], S5: [80000, 2000] }], ['P2', 'شركة ب — خطة تجريبية / Plan B', { S1: [25000, 1000], S2: [16000, 1000], S3: [18000, 2500], S4: [28000, 1000], S5: [85000, 3000] }]])
            await this.db.insert('plans', { id, name, payload: pack({ rates, valid_from: '2026-01-01', valid_to: '2027-12-31' }) });
        await this.db.insert('settings', { id: 'main', payload: pack({ facility: 'اسم منشأتك / Your medical center', closed_through: '', modules: ['clinic', 'accounting', 'insurance'] }) });
        await this.workflow.ensure();
        await this.admin.ensure();
        await this.pricing.ensure();
        await this.serviceWork.ensure();
        await this.results.ensure();
        await this.exams.ensure();
        await seedPublishedReferences(this);
        await this.audit(u, 'INITIAL_SETUP', 'system', '');
        return u;
    }
    role(u, ...allowed) { if (!allowed.includes(u.role))
        throw new RuleError('Access denied / غير مصرح'); }
    async branch(u, b) { if (!await this.one('SELECT * FROM branches WHERE id=?', [b]))
        throw new RuleError('Unknown branch'); if ((this.localBranch && b !== this.localBranch) || (!await this.admin.belongs(u, b)))
        throw new RuleError('Branch access denied / غير مصرح بهذا الفرع'); }
    async settings() { return JSON.parse((await this.one('SELECT payload FROM settings WHERE id=?', ['main'])).payload); }
    async writable() { const closed = (await this.settings()).closed_through; if (closed && businessDate() <= closed)
        throw new RuleError('Accounting period closed / الفترة مقفلة'); }
    async audit(u, action, entity_id, branch_id) { await this.db.insert('audit', { id: uid(), user_id: u.id, action, entity_id, branch_id, created_at: now() }); }
    async journal(b, source, memo, lines) {
        await this.writable();
        if (!lines.length || lines.reduce((n, l) => n + l[1] - l[2], 0) !== 0)
            throw new RuleError('Unbalanced journal / القيد غير متوازن');
        for (const [id, dr, cr] of lines) {
            const a = await this.one('SELECT * FROM accounts WHERE id=?', [id]);
            if (!a?.postable || dr < 0 || cr < 0 || (dr && cr) || !Number.isSafeInteger(dr) || !Number.isSafeInteger(cr))
                throw new RuleError('Invalid journal account or amount / حساب أو مبلغ غير صالح');
        }
        const id = uid();
        await this.db.insert('journals', { id, branch_id: b, source_id: source, memo: memo.slice(0, 400), created_at: now() });
        for (const [account_id, debit, credit, party] of lines)
            if (debit || credit)
                await this.db.insert('journal_lines', { id: uid(), journal_id: id, account_id, debit, credit, party: party.slice(0, 200) });
        return { id };
    }
    async patient(u, d) { return this.workflow.savePatient(u, d); }
    async visit(u, d) { return this.workflow.completeVisit(u, d); }
    async quote(d) {
        const booking = await this.pricing.visit(text(d.visit_id, 64)), tariff = booking?.tariff;
        if (tariff && booking && text(d.plan_id, 64) !== booking.plan_id)
            throw new RuleError('Pricing must match booked insurance');
        let plan;
        const plan_id = text(d.plan_id, 64);
        if (plan_id) {
            const p = await this.one('SELECT * FROM plans WHERE id=?', [plan_id]);
            if (!p)
                throw new RuleError('Unknown insurance plan');
            plan = JSON.parse(p.payload);
            if (plan.active === 0)
                throw new RuleError('Insurance plan is archived / خطة التأمين محذوفة');
            if (!(plan.valid_from <= businessDate() && businessDate() <= plan.valid_to))
                throw new RuleError('Insurance contract expired');
        }
        const discount = cents(d.discount ?? 0);
        if (plan && discount)
            throw new RuleError('Extra discount prohibited for insurance / لا يسمح بخصم إضافي للتأمين');
        if (!Array.isArray(d.items) || !d.items.length || d.items.length > 100)
            throw new RuleError('Select services / اختر الخدمات');
        const seen = new Set(), items = [];
        for (const raw of d.items) {
            if (!raw || typeof raw !== 'object')
                throw new RuleError('Invalid item');
            const line = raw;
            const sid = text(line.service_id, 64), s = await this.one('SELECT * FROM services WHERE id=?', [sid]);
            if (!s || (await this.one('SELECT active FROM service_details WHERE id=?', [sid]))?.active === 0 || seen.has(sid))
                throw new RuleError('Invalid or duplicate service');
            seen.add(sid);
            const qty = line.qty ?? 1;
            if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > 100)
                throw new RuleError('Invalid quantity');
            if (tariff?.service_id === sid && qty !== 1)
                throw new RuleError('Booked consultation quantity must be one / كمية الكشف المحجوز يجب أن تكون واحدة');
            const doctor_bp = tariff?.service_id === sid ? tariff.doctor_bp : s.doctor_bp;
            let price = tariff?.service_id === sid ? tariff.price : s.price, bp = 10000;
            if (plan) {
                if (!plan.rates[sid])
                    throw new RuleError('Service not covered');
                [price, bp] = tariff?.service_id === sid && tariff.contract_price !== undefined ? [tariff.contract_price, tariff.patient_bp] : plan.rates[sid];
            }
            const total = price * qty, pdue = portion(total, bp);
            items.push({ service_id: sid, name: s.name, qty, unit_price: price, total, patient_due: pdue, insurer_due: total - pdue, doctor_bp, doctor_due: portion(total, doctor_bp) });
        }
        if (tariff && !seen.has(tariff.service_id))
            throw new RuleError('Include the booked consultation service / أضف خدمة الكشف المحددة في الحجز');
        const sum = (k) => items.reduce((n, x) => n + x[k], 0), gross = sum('total');
        if (discount > gross)
            throw new RuleError('Discount exceeds invoice');
        return { items, gross, discount, total: gross - discount, patient_due: sum('patient_due') - discount, insurer_due: sum('insurer_due'), doctor_due: sum('doctor_due'), plan_id };
    }
    async invoice(u, d) { await this.admin.check(u, 'billing', 'add'); const b = text(d.branch_id, 64); await this.branch(u, b); const v = await this.one('SELECT * FROM visits WHERE id=?', [text(d.visit_id, 64)]); if (!v || v.branch_id !== b)
        throw new RuleError('Choose a visit in this branch'); const link = await this.one('SELECT details FROM visit_links WHERE visit_id=?', [v.id]); if (link) {
        const booked = JSON.parse(link.details);
        if (text(d.plan_id, 64) !== booked.plan_id)
            throw new RuleError('Invoice pricing must match the booking insurance / تسعير الفاتورة يجب أن يطابق تأمين الحجز');
    } if (await this.one('SELECT id FROM documents WHERE visit_id=? AND status=?', [v.id, 'posted']))
        throw new RuleError('This encounter already has a posted invoice / توجد فاتورة مرحلة لهذه الزيارة'); const q = await this.quote(d); const doc = { id: uid(), branch_id: b, kind: 'sale', party: v.patient_id, visit_id: v.id, payload: pack({ ...q, doctor_id: v.doctor_id }), total: q.total, patient_due: q.patient_due, insurer_due: q.insurer_due, doctor_due: q.doctor_due, status: 'posted', created_at: now() }; await this.db.insert('documents', doc); await this.journal(b, doc.id, 'فاتورة خدمات / Service invoice', [['1200', q.patient_due, 0, v.patient_id], ['1210', q.insurer_due, 0, q.plan_id], ['4090', q.discount, 0, v.patient_id], ['4000', 0, q.gross, v.patient_id], ['5100', q.doctor_due, 0, v.doctor_id], ['2200', 0, q.doctor_due, v.doctor_id]]); await this.audit(u, 'POST_INVOICE', doc.id, b); return doc; }
    async receipt(u, d) { await this.admin.check(u, 'billing', 'add'); const doc = await this.one('SELECT * FROM documents WHERE id=?', [text(d.document_id, 64)]); if (!doc || doc.status !== 'posted')
        throw new RuleError('Invoice unavailable'); await this.branch(u, doc.branch_id); const payer = d.payer ?? 'patient'; if (payer !== 'patient' && payer !== 'insurer')
        throw new RuleError('Invalid payer'); if (payer === 'insurer')
        this.role(u, 'admin', 'accountant'); const amount = cents(d.amount ?? 0), paid = (await this.db.all('SELECT * FROM payments WHERE document_id=? AND payer=?', [doc.id, payer])).reduce((n, x) => n + x.amount, 0); if (amount <= 0 || amount > doc[payer === 'patient' ? 'patient_due' : 'insurer_due'] - paid)
        throw new RuleError('Amount exceeds balance or is zero / المبلغ أكبر من المتبقي أو صفر'); const p = { id: uid(), document_id: doc.id, branch_id: doc.branch_id, payer, amount, created_at: now() }; await this.db.insert('payments', p); const party = payer === 'patient' ? doc.party : JSON.parse(doc.payload).plan_id; await this.journal(doc.branch_id, p.id, 'سند قبض / Receipt', [['1100', amount, 0, party], [payer === 'patient' ? '1200' : '1210', 0, amount, party]]); await this.audit(u, 'RECEIPT', p.id, doc.branch_id); return p; }
    async reverse(u, d) { await this.admin.check(u, 'billing', 'delete'); const doc = await this.one('SELECT * FROM documents WHERE id=?', [text(d.document_id, 64)]); if (!doc || doc.status !== 'posted')
        throw new RuleError('Already returned or missing'); await this.branch(u, doc.branch_id); if (await this.one('SELECT * FROM payments WHERE document_id=?', [doc.id]))
        throw new RuleError('Paid invoices need refund workflow; pending / رد الفواتير المحصلة غير متاح بهذه المرحلة'); const ls = await this.db.all('SELECT l.* FROM journal_lines l JOIN journals j ON j.id=l.journal_id WHERE j.source_id=?', [doc.id]); const result = await this.journal(doc.branch_id, uid(), 'مردود كامل / Full sales return', ls.map(x => [x.account_id, x.credit, x.debit, x.party])); await this.db.run('UPDATE documents SET status=? WHERE id=?', ['returned', doc.id]); await this.audit(u, 'FULL_RETURN', doc.id, doc.branch_id); return result; }
    async manual(u, d) { await this.admin.check(u, 'accounting', 'add'); const b = text(d.branch_id, 64); await this.branch(u, b); if (!Array.isArray(d.lines) || d.lines.length < 2 || d.lines.length > 100)
        throw new RuleError('At least two journal lines required'); const ls = d.lines.map((x) => [text(x.account_id, 64), cents(x.debit ?? 0), cents(x.credit ?? 0), text(x.party, 200)]); if (!ls.reduce((n, x) => n + x[1], 0))
        throw new RuleError('Empty journal'); const r = await this.journal(b, uid(), text(d.memo, 400), ls); await this.audit(u, 'MANUAL_JOURNAL', r.id, b); return r; }
    async account(u, d) { return saveAccount(this, u, d); }
    async saveSettings(u, d) { this.role(u, 'admin'); const s = await this.settings(); s.facility = text(d.facility, 200) || s.facility; const closed = text(d.closed_through, 10); if (closed && (!/^\d{4}-\d{2}-\d{2}$/.test(closed) || !Number.isFinite(Date.parse(closed)) || new Date(closed).toISOString().slice(0, 10) !== closed))
        throw new RuleError('Invalid closing date'); if (d.logo !== undefined) {
        const logo = text(d.logo, 180000);
        if (logo && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo))
            throw new RuleError('Choose PNG, JPEG or WebP logo up to 120 KB');
        s.logo = logo;
    } if (d.theme !== undefined) {
        if (!['teal', 'blue', 'indigo', 'purple', 'rose', 'emerald', 'amber', 'slate', 'dark', 'ocean', 'sand', 'forest'].includes(text(d.theme)))
            throw new RuleError('Unknown theme');
        s.theme = text(d.theme);
    } if (d.skin !== undefined) {
        if (!['classic', 'soft', 'compact', 'rounded'].includes(text(d.skin)))
            throw new RuleError('Unknown skin');
        s.skin = text(d.skin);
    } s.closed_through = closed; await this.db.run('UPDATE settings SET payload=? WHERE id=?', [pack(s), 'main']); await this.audit(u, 'UPDATE_SETTINGS', 'main', ''); return s; }
    async createUser(u, d) { return this.admin.saveUser(u, d); }
    async snapshot(u, b) {
        await this.branch(u, b);
        const access = await this.admin.access(u), outBranches = access.branches;
        const out = { branch_id: b, settings: await this.settings(), engine: this.db.engine, demo: true, user: await this.admin.safe(u), branches: (await this.db.all('SELECT * FROM branches')).filter(x => (!this.localBranch || x.id === this.localBranch) && (u.role === 'admin' || outBranches.includes(x.id))), catalogs: { specialties: [], diagnoses: [], medicines: [], lab_tests: [], radiology_tests: [], referral_sources: [], insurance_companies: [], doses: [], routes: [], frequencies: [], durations: [] }, clinics: [], assignments: [], appointments: [], archived_patients: [], patients: [], patient_names: [], visits: [], services: await this.db.all('SELECT * FROM services'), plans: await this.db.all('SELECT * FROM plans'), documents: [], accounts: [], journals: [], lines: [], payments: [], audit: [], doctors: await this.db.all('SELECT id,username,branch_id FROM users WHERE role=?', ['doctor']) };
        if (access.permissions.patients.view || access.permissions.bookings.view || access.permissions.visits.view) {
            out.patients = await this.db.all('SELECT * FROM patients ORDER BY created_at DESC');
            out.visits = u.role === 'doctor' ? await this.db.all('SELECT * FROM visits WHERE branch_id=? AND doctor_id=? ORDER BY created_at DESC', [b, u.id]) : await this.db.all('SELECT * FROM visits WHERE branch_id=? ORDER BY created_at DESC', [b]);
            if (u.role !== 'doctor') {
                out.patients = out.patients.map(p => ({ ...p, allergies: '' }));
                out.visits = out.visits.map(v => ({ ...v, payload: pack({ diagnosis: '' }) }));
            }
        }
        if (access.permissions.billing.view) {
            out.patient_names = await this.db.all('SELECT id,name FROM patients');
            out.documents = await this.db.all('SELECT * FROM documents WHERE branch_id=? ORDER BY created_at DESC', [b]);
            out.payments = await this.db.all('SELECT * FROM payments WHERE branch_id=?', [b]);
        }
        if (access.permissions.accounting.view) {
            out.accounts = await this.db.all('SELECT * FROM accounts ORDER BY id');
            out.journals = await this.db.all('SELECT * FROM journals WHERE branch_id=? ORDER BY created_at DESC', [b]);
            out.lines = await this.db.all('SELECT l.* FROM journal_lines l JOIN journals j ON j.id=l.journal_id WHERE j.branch_id=?', [b]);
            out.audit = await this.db.all('SELECT * FROM audit WHERE branch_id=? OR branch_id=? ORDER BY created_at DESC', [b, '']);
        }
        await this.workflow.decorateSnapshot(u, b, out);
        out.doctor_profiles = access.permissions.doctors.view ? await this.db.all('SELECT * FROM doctor_profiles') : [];
        out.services = await this.db.all('SELECT s.*,m.code,m.active FROM services s LEFT JOIN service_details m ON m.id=s.id');
        if (!access.permissions.visits.view)
            out.visits = [];
        if (!access.permissions.bookings.view && !access.permissions.visits.view)
            out.appointments = [];
        if (!access.permissions.patients.view) {
            out.patients = [];
            out.archived_patients = [];
        }
        if (!access.permissions.clinics.view && !access.permissions.bookings.view && !access.permissions.visits.view) {
            out.clinics = [];
            out.assignments = [];
        }
        const visible = (...pages) => pages.some(p => access.permissions[p].view);
        if (!visible('services', 'catalogs', 'billing', 'insurance', 'visits', 'clinics'))
            out.services = [];
        if (!visible('patients', 'bookings', 'billing', 'insurance', 'catalogs'))
            out.plans = [];
        if (!visible('clinics', 'doctors', 'bookings', 'visits', 'billing'))
            out.doctors = [];
        for (const k of ['diagnoses', 'medicines', 'lab_tests', 'radiology_tests', 'doses', 'routes', 'frequencies', 'durations'])
            if (!visible('catalogs', 'visits', 'external-services', 'lab-work', 'radiology-work'))
                out.catalogs[k] = [];
        if (!visible('catalogs', 'patients'))
            out.catalogs.referral_sources = [];
        if (!visible('catalogs', 'insurance', 'patients', 'bookings', 'billing', 'external-services'))
            out.catalogs.insurance_companies = [];
        if (!visible('catalogs', 'doctors', 'clinics', 'bookings', 'visits'))
            out.catalogs.specialties = [];
        out.tariffs = (access.permissions.clinics.view || access.permissions.bookings.view || access.permissions.visits.view) ? await this.db.all('SELECT t.* FROM appointment_tariffs t JOIN doctor_assignments a ON a.id=t.assignment_id WHERE a.branch_id=?', [b]) : [];
        out.external_patients = access.permissions['external-services'].view ? await this.db.all('SELECT p.id,p.name,p.phone FROM patients p LEFT JOIN patient_profiles f ON f.patient_id=p.id WHERE f.deleted_at IS NULL OR f.deleted_at=?', ['']) : [];
        out.exam_definitions = (access.permissions.catalogs.view || access.permissions.visits.view || access.permissions['lab-work'].view || access.permissions['radiology-work'].view || access.permissions['external-services'].view) ? Object.fromEntries((await this.db.all('SELECT * FROM exam_definitions')).map(x => [x.id, JSON.parse(x.payload)])) : {};
        out.service_requests = await this.serviceWork.list(u, b);
        if (out.service_requests.length && !out.patient_names.length)
            out.patient_names = (await this.db.all('SELECT id,name FROM patients')).filter(p => out.service_requests.some(q => q.patient_id === p.id));
        return out;
    }
    async execute(u, path, d) { await this.admin.route(u, path, d); switch (path) {
        case '/api/exam-definitions': return this.exams.save(u, d);
        case '/api/external-services': return this.exams.intake(u, d);
        case '/api/attachments': return this.attachments.save(u, d);
        case '/api/results': return this.results.save(u, d);
        case '/api/service-requests': return this.serviceWork.update(u, d);
        case '/api/tariffs': return this.pricing.save(u, d);
        case '/api/services': return this.admin.service(u, d);
        case '/api/doctors': return this.admin.doctor(u, d);
        case '/api/patients/delete': return this.workflow.deletePatient(u, d);
        case '/api/catalogs': return this.workflow.catalog(u, d);
        case '/api/clinics': return this.workflow.clinic(u, d);
        case '/api/assignments': return this.workflow.assign(u, d);
        case '/api/appointments': return this.workflow.book(u, d);
        case '/api/appointments/action': return this.workflow.appointmentAction(u, d);
        case '/api/plans': return this.workflow.plan(u, d);
        case '/api/patients': return this.patient(u, d);
        case '/api/visits': return this.visit(u, d);
        case '/api/invoices': return this.invoice(u, d);
        case '/api/receipts': return this.receipt(u, d);
        case '/api/returns': return this.reverse(u, d);
        case '/api/journals': return this.manual(u, d);
        case '/api/accounts': return this.account(u, d);
        case '/api/settings': return this.saveSettings(u, d);
        case '/api/users': return this.createUser(u, d);
        default: throw new RuleError('Unknown operation');
    } }
}
