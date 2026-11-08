import { seedPublishedReferences } from './reference-data.js';
import { demoResults } from './demo-results.js';
import { realisticDemo } from './demo-realistic.js';
import { roles, pack, now } from './core.js';
export async function seedDemo(c) {
    if (await c.one('SELECT id FROM settings WHERE id=?', ['demo-data-v1'])) {
        await realisticDemo(c);
        await seedPublishedReferences(c);
        await demoResults(c);
        return;
    }
    const users = await c.db.all('SELECT * FROM users');
    if (users.length !== 1 || users[0].username !== 'demo_admin' || await c.one('SELECT id FROM patients'))
        throw Error('Demo seed requires a separate empty demo database');
    const admin = users[0];
    for (const role of roles.filter(r => r !== 'admin'))
        await c.createUser(admin, { username: 'demo_' + role, password: 'Demo2026!', display_name: 'تجربة / Demo ' + role, role, branch_ids: ['B1', 'B2', 'B3', 'B4'] });
    const doctor = (await c.one('SELECT * FROM users WHERE username=?', ['demo_doctor']));
    const dx = await c.workflow.catalog(admin, { kind: 'diagnoses', name: 'تشخيص تجريبي للتدريب فقط / Training diagnosis' }), med = await c.workflow.catalog(admin, { kind: 'medicines', name: 'دواء وهمي للتجربة — ليس وصفة علاجية / Fictional training medicine' });
    await c.admin.doctor(admin, { id: doctor.id, name: 'طبيب تجريبي / Demo doctor', specialty_id: 'SP_GENERAL', phone: '00000000000' });
    for (let n = 1; n <= 6; n++) {
        await c.workflow.catalog(admin, { kind: 'diagnoses', name: 'تشخيص وهمي إضافي ' + n + ' / Training diagnosis ' + n });
        await c.workflow.catalog(admin, { kind: 'medicines', name: 'دواء وهمي إضافي ' + n + ' / Fictional medicine ' + n });
        await c.workflow.catalog(admin, { kind: 'lab_tests', name: 'تحليل تجريبي ' + n + ' / Demo lab ' + n, service_id: 'S3' });
        await c.workflow.catalog(admin, { kind: 'radiology_tests', name: 'أشعة تجريبية ' + n + ' / Demo radiology ' + n, service_id: 'S4' });
    }
    for (const plan of await c.db.all('SELECT * FROM plans')) {
        const r = JSON.parse(plan.payload), year = new Date().getFullYear();
        r.valid_from = (year - 1) + '-01-01';
        r.valid_to = (year + 1) + '-12-31';
        await c.db.run('UPDATE plans SET payload=? WHERE id=?', [pack(r), plan.id]);
    }
    const today = new Date().toISOString().slice(0, 10);
    for (const b of ['B1', 'B2', 'B3', 'B4']) {
        const assign = await c.workflow.assign(admin, { branch_id: b, clinic_id: 'CL_' + b, doctor_id: doctor.id });
        await c.pricing.save(admin, { assignment_id: assign.id, rates: [{ visit_type: 'consultation', service_id: 'S1', price: 500, doctor_percent: 30 }, { visit_type: 'advice', service_id: 'S2', price: 250, doctor_percent: 30 }] });
        for (let i = 0; i < 16; i++) {
            const p = await c.patient(admin, { name: `مريض تجريبي ${b}-${i + 1} / Demo patient`, birth_date: `${1980 + i}-01-15`, phone: '00000000000', payer_type: i % 4 === 0 ? 'insurance' : 'normal', insurer_id: i % 4 === 0 ? 'INS_A' : '', plan_id: i % 4 === 0 ? 'P1' : '', referral_source_id: i % 2 ? 'REF_FB' : 'REF_GOOGLE', allergies: 'بيانات تدريبية فقط' });
            const a = await c.workflow.book(admin, { branch_id: b, patient_id: p.id, assignment_id: assign.id, visit_type: i % 2 ? 'advice' : 'consultation', scheduled_at: today + `T${String(6 + (['B1', 'B2', 'B3', 'B4'].indexOf(b) * 4) + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}:00Z` });
            if (i < 8) {
                await c.workflow.appointmentAction(doctor, { id: a.id, action: 'start' });
                const v = await c.visit(doctor, { appointment_id: a.id, complaint: 'شكوى وهمية للتدريب فقط', diagnosis_id: dx.id, examination: 'ملاحظات تجريبية غير علاجية', prescriptions: [{ medicine_id: med.id, strength: 'تجريبي', dose: 'تجريبي', route: 'تجريبي', frequency: 'تجريبي', duration: 'تجريبي' }], lab_ids: ['LAB_CBC'], radiology_ids: ['RAD_CHEST'], follow_up: 'بيانات تدريبية فقط' });
                const inv = await c.invoice(admin, { branch_id: b, visit_id: v.id, plan_id: i % 4 === 0 ? 'P1' : '', discount: 0, items: [{ service_id: i % 2 ? 'S2' : 'S1', qty: 1 }] });
                if (i < 5)
                    await c.receipt(admin, { document_id: inv.id, amount: inv.patient_due / 100 });
            }
            else if (i === 15)
                await c.workflow.appointmentAction(admin, { id: a.id, action: 'cancel' });
        }
    }
    await c.db.insert('settings', { id: 'demo-data-v1', payload: pack({ installed_at: now() }) });
    await realisticDemo(c);
    await seedPublishedReferences(c);
    await demoResults(c);
}
