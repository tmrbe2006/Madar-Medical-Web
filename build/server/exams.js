import { RuleError, text, uid, now, pack } from './core.js';
export class Exams {
    c;
    constructor(c) {
        this.c = c;
    }
    async definition(kind, id) { const row = await this.c.one('SELECT payload FROM exam_definitions WHERE id=?', [id]); if (row) {
        const d = JSON.parse(row.payload);
        if (kind === 'lab_tests')
            d.rows = d.rows.map((r, i) => ({ ...r, id: r.id || id + ':P' + (i + 1) }));
        return d;
    } const item = await this.c.one(`SELECT name FROM ${kind === 'lab_tests' ? 'lab_tests' : 'radiology_tests'} WHERE id=?`, [id]); return { kind, description: kind === 'radiology_tests' ? 'اسم الفحص: ' + (item?.name || '') + '\nوصف الصورة بواسطة المختص: ' : '', reference_context: kind === 'lab_tests' ? 'يحدد المعمل الوحدة والمدى المرجعي المعتمد قبل إصدار النتائج.' : '', rows: kind === 'lab_tests' ? [{ id: id + ':P1', parameter: item?.name || '', unit: '', reference: '' }] : [] }; }
    async save(u, d) { await this.c.admin.check(u, 'catalogs', 'edit'); const kind = text(d.kind), id = text(d.id, 64); if (!['lab_tests', 'radiology_tests'].includes(kind) || !await this.c.one(`SELECT id FROM ${kind} WHERE id=?`, [id]))
        throw new RuleError('Select a valid test'); if (!Array.isArray(d.rows) || d.rows.length > 100)
        throw new RuleError('Invalid parameters'); const rows = d.rows.map(x => { if (!x || typeof x !== 'object')
        throw new RuleError('Invalid parameter'); const r = x, parameter = text(r.parameter, 200).trim(); if (!parameter)
        throw new RuleError('Parameter name required'); return { id: text(r.id, 100) || uid(), parameter, unit: text(r.unit, 80), reference: text(r.reference, 400) }; }); if (kind === 'lab_tests' && (!rows.length || new Set(rows.map(r => r.id)).size !== rows.length || new Set(rows.map(r => r.parameter.toLowerCase())).size !== rows.length))
        throw new RuleError('Each test needs distinct parameters / أضف بارامترات غير مكررة للتحليل'); const existing = await this.c.one('SELECT payload FROM exam_definitions WHERE id=?', [id]), prior = existing ? JSON.parse(existing.payload) : {}; const payload = pack({ kind, schema_version: 2, managed: true, published_adult: d.published_adult === true, source_url: prior.source_url || '', source_checked: prior.source_checked || '', description: text(d.description, 12000), reference_context: text(d.reference_context, 2000), rows: kind === 'lab_tests' ? rows : [] }); if (await this.c.one('SELECT id FROM exam_definitions WHERE id=?', [id]))
        await this.c.db.run('UPDATE exam_definitions SET payload=? WHERE id=?', [payload, id]);
    else
        await this.c.db.insert('exam_definitions', { id, payload }); await this.c.audit(u, 'UPDATE_EXAM_DEFINITION', id, ''); return { id, ...JSON.parse(payload) }; }
    async details(id) { const d = await this.c.one('SELECT payload FROM request_details WHERE id=?', [id]); return d ? JSON.parse(d.payload) : undefined; }
    async capture(q, source = 'doctor', extra = {}) { const definition = await this.definition(q.department === 'lab' ? 'lab_tests' : 'radiology_tests', q.catalog_id), payload = pack({ source, definition: q.department === 'lab' ? { ...definition, schema_version: 2 } : definition, ...extra }); await this.c.db.insert('request_details', { id: q.id, payload }); }
    async ensure() { if (await this.c.one('SELECT id FROM settings WHERE id=?', ['exams-v1']))
        return; if (await this.c.one('SELECT id FROM lab_tests WHERE id=?', ['LAB_CBC']) && !await this.c.one('SELECT id FROM exam_definitions WHERE id=?', ['LAB_CBC']))
        await this.c.db.insert('exam_definitions', { id: 'LAB_CBC', payload: pack({ kind: 'lab_tests', description: 'صورة دم كاملة / Complete blood count', reference_context: 'يحدد المعمل المدى المرجعي وفق الجهاز والطريقة والعمر والنوع؛ لا توجد قيم طبيعية مفترضة.', rows: ['WBC', 'RBC', 'Hemoglobin (Hb)', 'Hematocrit (HCT)', 'MCV', 'MCH', 'MCHC', 'Platelets'].map((parameter, i) => ({ parameter, unit: ['10^9/L', '10^12/L', 'g/dL', '%', 'fL', 'pg', 'g/dL', '10^9/L'][i], reference: '' })) }) }); for (const q of await this.c.db.all('SELECT * FROM service_requests'))
        if (!await this.c.one('SELECT id FROM request_details WHERE id=?', [q.id]))
            await this.capture(q); await this.c.db.insert('settings', { id: 'exams-v1', payload: pack({ installed_at: now() }) }); }
    async intake(u, d) { await this.c.admin.check(u, 'external-services', 'add'); const b = text(d.branch_id, 64); await this.c.branch(u, b); const p = await this.c.one('SELECT * FROM patients WHERE id=?', [text(d.patient_id, 64)]); if (!p || (await this.c.workflow.profile(p.id)).deleted_at)
        throw new RuleError('Select an active patient'); const department = text(d.department), kind = department === 'lab' ? 'lab_tests' : 'radiology_tests'; if (!['lab', 'radiology'].includes(department) || !Array.isArray(d.tests) || !d.tests.length || d.tests.length > 50 || new Set(d.tests).size !== d.tests.length)
        throw new RuleError('Choose tests in one department'); const scheduled_at = text(d.scheduled_at, 30); if (!Number.isFinite(Date.parse(scheduled_at)) || !/(Z|[+-]\d{2}:\d{2})$/.test(scheduled_at))
        throw new RuleError('Invalid schedule'); const booking_id = uid(), result = []; for (const id of d.tests) {
        const test = await this.c.one(`SELECT * FROM ${kind} WHERE id=?`, [text(id, 64)]);
        if (!test?.active)
            throw new RuleError('Test unavailable');
        const q = { id: uid(), visit_id: 'EXT:' + uid(), branch_id: b, patient_id: p.id, department: department, catalog_id: test.id, name: test.name, status: 'requested', created_at: now(), updated_at: now() };
        await this.c.db.insert('service_requests', q);
        await this.capture(q, 'external', { booking_id, scheduled_at, notes: text(d.notes, 2000), patient_name: p.name });
        await this.c.audit(u, 'BOOK_EXTERNAL_TEST', q.id, b);
        result.push(q);
    } return { booking_id, requests: result }; }
}
