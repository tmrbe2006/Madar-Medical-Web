import { pack, now } from './core.js';
export const demoMedicines = ['باراسيتامول / Paracetamol', 'إيبوبروفين / Ibuprofen', 'ميتفورمين / Metformin', 'أملوديبين / Amlodipine', 'إنالابريل / Enalapril', 'لوسارتان / Losartan', 'أتورفاستاتين / Atorvastatin', 'سيمفاستاتين / Simvastatin', 'أوميبرازول / Omeprazole', 'فاموتيدين / Famotidine', 'سيتريزين / Cetirizine', 'لوراتادين / Loratadine', 'سالبوتامول / Salbutamol', 'بوديزونيد / Budesonide', 'أموكسيسيلين / Amoxicillin', 'أزيثروميسين / Azithromycin', 'دوكسيسيكلين / Doxycycline', 'ميترونيدازول / Metronidazole', 'سيفترياكسون / Ceftriaxone', 'أسيكلوفير / Aciclovir', 'فلوكونازول / Fluconazole', 'كلوتريمازول / Clotrimazole', 'هيدروكورتيزون / Hydrocortisone', 'بريدنيزولون / Prednisolone', 'ليفوثيروكسين / Levothyroxine', 'حمض الفوليك / Folic acid', 'كبريتات الحديدوز / Ferrous sulfate', 'لاكتولوز / Lactulose', 'محلول الإماهة الفموي / Oral rehydration salts', 'فوروسيميد / Furosemide'];
const specialties = ['طب الأطفال / Pediatrics', 'الباطنة / Internal medicine', 'القلب والأوعية الدموية / Cardiology', 'العظام / Orthopedics', 'النساء والتوليد / Obstetrics and gynecology', 'الجلدية / Dermatology', 'الأنف والأذن والحنجرة / ENT', 'الرمد / Ophthalmology', 'المخ والأعصاب / Neurology', 'المسالك البولية / Urology', 'الجراحة العامة / General surgery', 'طب الأسنان / Dentistry'];
const diagnoses = ['ارتفاع ضغط الدم / Hypertension', 'داء السكري من النوع الثاني / Type 2 diabetes', 'التهاب الأنف التحسسي / Allergic rhinitis', 'الربو / Asthma', 'فقر الدم بسبب نقص الحديد / Iron deficiency anemia', 'الارتجاع المعدي المريئي / Gastroesophageal reflux', 'التهاب الجيوب الأنفية / Sinusitis', 'الصداع النصفي / Migraine', 'التهاب الجلد التأتبي / Atopic dermatitis', 'خشونة الركبة / Knee osteoarthritis', 'التهاب الأذن الوسطى / Otitis media', 'قصور الغدة الدرقية / Hypothyroidism', 'نزلة برد / Common cold', 'عدوى المسالك البولية / Urinary tract infection', 'آلام أسفل الظهر / Low back pain'];
const labs = ['صورة دم كاملة / Complete blood count', 'سكر صائم / Fasting blood glucose', 'سكر تراكمي / HbA1c', 'وظائف كبد / Liver function tests', 'وظائف كلى / Renal function tests', 'كرياتينين / Creatinine', 'يوريا / Urea', 'حمض اليوريك / Uric acid', 'تحليل بول كامل / Urinalysis', 'مزرعة بول / Urine culture', 'تحليل براز / Stool analysis', 'دهون الدم / Lipid profile', 'كوليسترول كلي / Total cholesterol', 'هرمون الغدة الدرقية / TSH', 'ثيروكسين حر / Free T4', 'فيتامين د / Vitamin D', 'فيتامين ب12 / Vitamin B12', 'مخزون الحديد / Ferritin', 'بروتين سي التفاعلي / CRP', 'سرعة الترسيب / ESR', 'زمن البروثرومبين / PT and INR', 'كالسيوم / Calcium', 'صوديوم / Sodium', 'بوتاسيوم / Potassium'];
const radiology = ['أشعة صدر / Chest X-ray', 'أشعة ركبة / Knee X-ray', 'أشعة فقرات قطنية / Lumbar spine X-ray', 'أشعة حوض / Pelvis X-ray', 'موجات صوتية على البطن والحوض / Abdominopelvic ultrasound', 'موجات صوتية على الغدة الدرقية / Thyroid ultrasound', 'موجات صوتية على الثدي / Breast ultrasound', 'دوبلر أوردة الطرف السفلي / Lower limb venous Doppler', 'موجات صوتية على القلب / Echocardiography', 'أشعة مقطعية على المخ / Brain CT', 'أشعة مقطعية على الصدر / Chest CT', 'رنين مغناطيسي على المخ / Brain MRI', 'رنين مغناطيسي على الركبة / Knee MRI', 'رنين مغناطيسي على الفقرات القطنية / Lumbar spine MRI', 'أشعة بانوراما الأسنان / Dental panoramic X-ray'];
const names = ['أحمد محمود حسن', 'محمد عادل إبراهيم', 'سارة أحمد يوسف', 'مريم خالد علي', 'عمر مصطفى عبد الله', 'فاطمة محمد أمين', 'يوسف سامح حسين', 'نورهان إبراهيم سعيد', 'محمود حسام عبد الرحمن', 'هدى أشرف كمال', 'خالد شريف عثمان', 'آية طارق سليمان', 'حسن أحمد لطفي', 'نهى علاء عبد العزيز', 'مصطفى عماد فتحي', 'إيمان وليد منصور'];
export async function realisticDemo(c) {
    if (await c.one('SELECT id FROM settings WHERE id=?', ['demo-realistic-v2']))
        return;
    if (!await c.one('SELECT id FROM settings WHERE id=?', ['demo-data-v1']))
        throw Error('Realistic seed is demo-only');
    const admin = (await c.one('SELECT * FROM users WHERE username=?', ['demo_admin']));
    if (!admin)
        throw Error('Demo admin missing');
    const add = async (kind, name, service_id = '') => { const old = await c.one(`SELECT id FROM ${kind} WHERE name=?`, [name]); if (old && service_id)
        return c.workflow.catalog(admin, { kind, id: old.id, name, service_id }); return old || await c.workflow.catalog(admin, { kind, name, service_id }); };
    for (const name of demoMedicines)
        await add('medicines', name);
    for (const name of diagnoses)
        await add('diagnoses', name);
    for (const [kind, list, category] of [['lab_tests', labs, 'lab'], ['radiology_tests', radiology, 'radiology']])
        for (let i = 0; i < list.length; i++) {
            const name = list[i], service = await c.one('SELECT id FROM services WHERE name=?', [name]) || await c.admin.service(admin, { name, category, price: 100 + i * 25, doctor_percent: 0 });
            await add(kind, name, service.id);
        }
    // Archive only the old placeholder catalog options; historical records retain their snapshots.
    for (const kind of ['medicines', 'diagnoses', 'lab_tests', 'radiology_tests'])
        for (const x of await c.db.all(`SELECT id,name FROM ${kind}`))
            if (/وهمي|تجريب|Fictional|Training|Demo lab|Demo radiology/.test(x.name))
                await c.db.run(`UPDATE ${kind} SET active=? WHERE id=?`, [0, x.id]);
    const allServices = await c.db.all('SELECT * FROM services');
    for (const [id, name] of [['INS_A', 'أكسا مصر / AXA Egypt'], ['INS_B', 'أليانز مصر / Allianz Egypt']])
        await c.db.run('UPDATE insurance_companies SET name=? WHERE id=?', [name, id]);
    const misr = await add('insurance_companies', 'مصر للتأمين / Misr Insurance');
    for (const [i, insurer_id] of ['INS_A', 'INS_B', misr.id].entries()) {
        const id = i < 2 ? 'P' + (i + 1) : 'DEMO_MISR', rules = { insurer_id, active: 1, valid_from: (new Date().getFullYear() - 1) + '-01-01', valid_to: (new Date().getFullYear() + 1) + '-12-31', rates: Object.fromEntries(allServices.map(s => [s.id, [Math.round(s.price * .8), 2000]])) };
        if (await c.one('SELECT id FROM plans WHERE id=?', [id]))
            await c.db.run('UPDATE plans SET name=?,payload=? WHERE id=?', ['تعاقد توضيحي — أسعار افتراضية ' + (i + 1), pack(rules), id]);
        else
            await c.db.insert('plans', { id, name: 'تعاقد توضيحي — أسعار افتراضية ' + (i + 1), payload: pack(rules) });
    }
    for (const b of ['B1', 'B2', 'B3', 'B4'])
        await c.db.run('UPDATE clinics SET name=? WHERE id=?', ['عيادة الطب العام / General practice', 'CL_' + b]);
    for (let i = 0; i < specialties.length; i++) {
        const sp = await add('specialties', specialties[i]), user = i === 0 ? (await c.one('SELECT * FROM users WHERE username=?', ['demo_doctor'])) : await c.createUser(admin, { username: 'demo_doctor' + (i + 1), password: 'Demo2026!', display_name: 'د. ' + names[i], role: 'doctor', branch_ids: ['B1', 'B2', 'B3', 'B4'] });
        await c.admin.doctor(admin, { id: user.id, name: 'د. ' + names[i], specialty_id: sp.id, phone: '00000000000' });
        const examName = 'كشف ' + specialties[i], adviceName = 'استشارة ' + specialties[i];
        const exam = await c.admin.service(admin, { name: examName, category: 'clinic', price: 250 + i * 30, doctor_percent: 30 }), advice = await c.admin.service(admin, { name: adviceName, category: 'clinic', price: 150 + i * 20, doctor_percent: 30 });
        for (const b of ['B1', 'B2', 'B3', 'B4']) {
            const clinic = await c.workflow.clinic(admin, { branch_id: b, name: 'عيادة ' + specialties[i], specialty_id: sp.id });
            const a = await c.workflow.assign(admin, { branch_id: b, clinic_id: clinic.id, doctor_id: user.id });
            await c.pricing.save(admin, { assignment_id: a.id, rates: [{ visit_type: 'consultation', service_id: exam.id, price: 250 + i * 30, doctor_percent: 30 }, { visit_type: 'advice', service_id: advice.id, price: 150 + i * 20, doctor_percent: 30 }] });
        }
    }
    for (const plan of await c.db.all('SELECT * FROM plans')) {
        const r = JSON.parse(plan.payload);
        for (const service of await c.db.all('SELECT * FROM services'))
            if (!r.rates[service.id])
                r.rates[service.id] = [Math.round(service.price * .8), 2000];
        await c.db.run('UPDATE plans SET payload=? WHERE id=?', [pack(r), plan.id]);
    }
    const patients = await c.db.all('SELECT id FROM patients ORDER BY created_at');
    for (let i = 0; i < patients.length; i++)
        await c.db.run('UPDATE patients SET name=? WHERE id=?', [names[i % names.length] + ' ' + ['مدبولي', 'الشريف', 'النجار', 'مراد'][Math.floor(i / names.length) % 4], patients[i].id]);
    const waitingPatients = await c.db.all('SELECT id FROM patients ORDER BY created_at');
    for (const doctor of await c.db.all('SELECT * FROM users WHERE role=?', ['doctor'])) {
        if (doctor.username === 'demo_doctor')
            continue;
        const assignment = await c.one('SELECT id FROM doctor_assignments WHERE doctor_id=? AND branch_id=?', [doctor.id, 'B1']);
        if (assignment)
            for (let i = 0; i < 4; i++)
                await c.workflow.book(admin, { branch_id: 'B1', patient_id: waitingPatients[i].id, assignment_id: assignment.id, visit_type: i % 2 ? 'advice' : 'consultation', scheduled_at: new Date().toISOString().slice(0, 10) + 'T10:' + String(i * 15).padStart(2, '0') + ':00Z' });
    }
    for (const a of await c.db.all('SELECT * FROM appointments')) {
        const d = JSON.parse(a.details), doc = await c.one('SELECT name FROM doctor_profiles WHERE user_id=?', [a.doctor_id]), clinic = await c.one('SELECT name FROM clinics WHERE id=?', [a.clinic_id]);
        d.doctor_name = doc?.name || d.doctor_name;
        d.clinic_name = clinic?.name || d.clinic_name;
        if (d.insurer_id)
            d.insurer_name = (await c.one('SELECT name FROM insurance_companies WHERE id=?', [d.insurer_id]))?.name || d.insurer_name;
        await c.db.run('UPDATE appointments SET details=? WHERE id=?', [pack(d), a.id]);
        await c.db.run('UPDATE visit_links SET details=? WHERE appointment_id=?', [pack(d), a.id]);
    }
    for (const v of await c.db.all('SELECT * FROM visits')) {
        const n = JSON.parse(v.payload);
        if (!/وهمية|تجريب/.test(n.complaint))
            continue;
        const patient = await c.one('SELECT name FROM patients WHERE id=?', [v.patient_id]);
        n.patient_name = patient?.name;
        n.complaint = 'صداع متقطع منذ يومين — حالة محاكاة';
        n.examination = 'بيانات محاكاة للتدريب، لا تمثل فحصًا حقيقيًا';
        n.diagnosis = 'صداع / Headache';
        n.prescriptions = [];
        n.prescription = 'لم تعتمد أدوية لهذه الحالة التجريبية؛ استخدم القوائم عند كتابة كشف جديد.';
        await c.db.run('UPDATE visits SET payload=? WHERE id=?', [pack(n), v.id]);
    }
    await c.db.insert('settings', { id: 'demo-realistic-v2', payload: pack({ installed_at: now(), synthetic_people: true, sample_prices: true }) });
}
