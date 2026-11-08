import { createHash } from 'node:crypto';
import { RuleError, text, uid, now } from './core.js';
export class Attachments {
    c;
    constructor(c) {
        this.c = c;
    }
    async writable(u, id) { const q = await this.c.one('SELECT * FROM service_requests WHERE id=?', [id]); if (!q || q.department !== 'radiology')
        throw new RuleError('Radiology request required'); await this.c.branch(u, q.branch_id); await this.c.admin.check(u, 'radiology-work', 'edit'); const r = await this.c.one('SELECT * FROM service_results WHERE request_id=?', [id]); if (q.status !== 'in_progress' || (r && r.status !== 'draft'))
        throw new RuleError('Images can change only while result is a draft / الصور تعدل قبل إرسال النتيجة فقط'); return q; }
    async save(u, d) {
        if (d.remove === true) {
            const old = await this.c.one('SELECT * FROM result_attachments WHERE id=? AND active=?', [text(d.id, 64), 1]);
            if (!old)
                throw new RuleError('Image missing');
            await this.writable(u, old.request_id);
            await this.c.db.run('UPDATE result_attachments SET active=? WHERE id=?', [0, old.id]);
            await this.c.audit(u, 'REMOVE_RADIOLOGY_IMAGE', old.id, '');
            return { id: old.id };
        }
        const request_id = text(d.request_id, 64), q = await this.writable(u, request_id), data = text(d.data, 3000000), mime = text(d.mime, 40);
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data))
            throw new RuleError('Invalid image encoding');
        const bytes = Buffer.from(data, 'base64');
        if (bytes.length > 2 * 1024 * 1024 || !bytes.length)
            throw new RuleError('Each image must be 2 MB or less');
        const valid = mime === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 || mime === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
        if (!valid)
            throw new RuleError('Use a valid PNG, JPEG or WebP image');
        const digest = createHash('sha256').update(bytes).digest('hex');
        const old = await this.c.one('SELECT * FROM result_attachments WHERE request_id=? AND digest=? AND active=?', [request_id, digest, 1]);
        if (old)
            return { id: old.id, filename: old.filename, mime: old.mime, bytes: old.bytes };
        if ((await this.c.db.all('SELECT id FROM result_attachments WHERE request_id=? AND active=?', [request_id, 1])).length >= 8)
            throw new RuleError('Maximum 8 images per request');
        const a = { id: uid(), request_id, filename: text(d.filename, 160) || 'image', mime, bytes: bytes.length, digest, data, created_at: now(), created_by: u.id, active: 1 };
        await this.c.db.insert('result_attachments', a);
        await this.c.audit(u, 'ADD_RADIOLOGY_IMAGE', a.id, q.branch_id);
        return { id: a.id, filename: a.filename, mime: a.mime, bytes: a.bytes };
    }
    async read(u, id) { const a = await this.c.one('SELECT * FROM result_attachments WHERE id=? AND active=?', [id, 1]); if (!a)
        throw new RuleError('Image missing'); const q = await this.c.one('SELECT * FROM service_requests WHERE id=?', [a.request_id]); if (!q)
        throw new RuleError('Request missing'); await this.c.branch(u, q.branch_id); const rights = await this.c.admin.access(u); if (!rights.permissions['radiology-work'].view) {
        const r = await this.c.one('SELECT * FROM service_results WHERE request_id=?', [q.id]), v = await this.c.one('SELECT doctor_id FROM visits WHERE id=?', [q.visit_id]);
        if (u.role !== 'doctor' || v?.doctor_id !== u.id || r?.status !== 'approved')
            throw new RuleError('Image access denied');
    } return a; }
}
