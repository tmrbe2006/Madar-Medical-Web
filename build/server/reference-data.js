import { pack } from './core.js';
const cbcSource = 'https://www.mayocliniclabs.com/test-catalog/Overview/42120';
const chemistrySource = 'https://www.mayocliniclabs.com/test-catalog/overview/113630';
const mccSource = 'https://mcc.ca/examinations-assessments/resources-to-help-with-exam-prep/normal-lab-values/';
const cbc = [['WBC / كريات الدم البيضاء', '10^9/L', 'Adult: 3.4–9.6'], ['RBC / كريات الدم الحمراء', '10^12/L', 'Adult male: 4.35–5.65; adult female: 3.92–5.13'], ['Hemoglobin (Hb) / الهيموجلوبين', 'g/dL', 'Adult male: 13.2–16.6; adult female: 11.6–15.0'], ['Hematocrit (HCT) / الهيماتوكريت', '%', 'Adult male: 38.3–48.6; adult female: 35.5–44.9'], ['MCV / متوسط حجم الكرية', 'fL', 'Adult: 78.2–97.9'], ['RDW / تباين حجم الكريات', '%', 'Adult male: 11.8–14.5; adult female: 12.2–16.1'], ['Platelets / الصفائح الدموية', '10^9/L', 'Adult male: 135–317; adult female: 157–371']];
const creatinine = ['Creatinine / الكرياتينين', 'mg/dL', 'Adult male: 0.74–1.35; adult female: 0.59–1.04'];
const sodium = ['Sodium (Na) / الصوديوم', 'mmol/L', 'Adult: 135–145'];
const potassium = ['Potassium (K) / البوتاسيوم', 'mmol/L', 'Adult: 3.6–5.2'];
export async function seedPublishedReferences(c) {
    for (const item of await c.db.all('SELECT id,name FROM lab_tests')) {
        const n = item.name.toLowerCase();
        let rows, source = '';
        if (item.id === 'LAB_CBC' || n.includes('complete blood') || n.includes('صورة دم')) {
            rows = cbc;
            source = cbcSource;
        }
        else if (n.includes('creatinine') || n.includes('كرياتينين')) {
            rows = [creatinine];
            source = chemistrySource;
        }
        else if (n.includes('renal function') || n.includes('وظائف كلى')) {
            rows = [creatinine, sodium, potassium];
            source = chemistrySource;
        }
        else if (n.includes('sodium') || n.includes('صوديوم')) {
            rows = [sodium];
            source = chemistrySource;
        }
        else if (n.includes('potassium') || n.includes('بوتاسيوم')) {
            rows = [potassium];
            source = chemistrySource;
        }
        else if (n.includes('calcium') || n.includes('كالسيوم')) {
            rows = [['Calcium, total / الكالسيوم الكلي', 'mg/dL', '18–59 years: 8.6–10.0; ≥60 years: 8.8–10.2']];
            source = 'https://www.mayocliniclabs.com/test-catalog/Overview/601514';
        }
        else if (n.includes('hba1c') || n.includes('سكر تراكمي')) {
            rows = [['HbA1c / الهيموجلوبين السكري', '%', 'Adult published reference: 4.8–6.0']];
            source = mccSource;
        }
        else if (n.includes('fasting blood glucose') || n.includes('سكر صائم')) {
            rows = [['Fasting glucose / سكر صائم', 'mmol/L', 'Adult, fasting: 4.0–6.0']];
            source = mccSource;
        }
        else if (n.includes('tsh') || n.includes('هرمون الغدة الدرقية')) {
            rows = [['Thyroid-stimulating hormone (TSH) / الهرمون المحفز للغدة', 'mIU/L', 'Adult: 0.34–5.60 (Beckman DXI source)']];
            source = mccSource;
        }
        else if (n.includes('free t4') || n.includes('ثيروكسين حر')) {
            rows = [['Free thyroxine (FT4) / الثيروكسين الحر', 'pmol/L', 'Adult: 7.0–17.0 (Beckman DXI source)']];
            source = mccSource;
        }
        if (!rows)
            continue;
        const old = await c.one('SELECT payload FROM exam_definitions WHERE id=?', [item.id]), previous = old ? JSON.parse(old.payload) : undefined;
        if (previous && (previous.managed || previous.source_url || previous.rows?.some((r) => r.reference) || !String(previous.reference_context || '').startsWith('يحدد المعمل')))
            continue;
        const value = { kind: 'lab_tests', description: item.name, reference_context: 'Published adult reference intervals (18+), not locally validated. Verify method/analyzer and sex/age before use. / مديات منشورة للبالغين فقط؛ راجع الطريقة والجهاز والنوع والعمر واعتمد مرجع المعمل قبل الاستخدام.', source_url: source, source_checked: '2026-11-07', published_adult: true, rows: rows.map(([parameter, unit, reference]) => ({ parameter, unit, reference })) };
        if (old)
            await c.db.run('UPDATE exam_definitions SET payload=? WHERE id=?', [pack(value), item.id]);
        else
            await c.db.insert('exam_definitions', { id: item.id, payload: pack(value) });
    }
}
