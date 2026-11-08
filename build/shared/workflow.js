export function ageYears(birthDate, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date())) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isFinite(Date.parse(birthDate)) || new Date(birthDate).toISOString().slice(0, 10) !== birthDate || birthDate > today)
        return null;
    const [y, m, d] = birthDate.split('-').map(Number), [ty, tm, td] = today.split('-').map(Number);
    return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}
export function cairoInputDate(iso) { const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)); const p = Object.fromEntries(parts.map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; }
export function cairoDateTimeToISO(value) { if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw Error('Invalid Cairo date and time / موعد غير صالح'); const target = Date.parse(value + ':00Z'); if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 16) !== value)
    throw Error('Invalid date'); let instant = target; for (let i = 0; i < 4; i++) {
    const displayed = Date.parse(cairoInputDate(new Date(instant).toISOString()) + ':00Z');
    instant += target - displayed;
    if (cairoInputDate(new Date(instant).toISOString()) === value)
        return new Date(instant).toISOString();
} throw Error('This local time is unavailable because of a clock change / الموعد غير متاح بسبب تغيير الساعة'); }
