export const screens = ['external-services', 'result-approval', 'lab-work', 'radiology-work', 'dashboard', 'patients', 'bookings', 'visits', 'clinics', 'doctors', 'catalogs', 'services', 'billing', 'insurance', 'accounting', 'users', 'settings', 'roadmap'];
export function defaultPermissions(role) {
    const p = Object.fromEntries(screens.map(s => [s, { view: false, add: false, edit: false, delete: false }]));
    const grant = (s, ...actions) => actions.forEach(a => p[s][a] = true);
    if (role === 'lab')
        grant('lab-work', 'view', 'edit');
    if (role === 'radiology')
        grant('radiology-work', 'view', 'edit');
    grant('dashboard', 'view');
    grant('roadmap', 'view');
    if (role === 'admin') {
        for (const s of screens)
            grant(s, 'view', 'add', 'edit', 'delete');
        return p;
    }
    if (['doctor', 'reception'].includes(role))
        grant('patients', 'view', 'add', 'edit');
    if (role === 'reception') {
        grant('external-services', 'view', 'add');
        grant('patients', 'delete');
        grant('bookings', 'view', 'add', 'edit', 'delete');
        grant('visits', 'view');
    }
    if (role === 'doctor')
        grant('visits', 'view', 'add', 'edit');
    if (['accountant', 'reception'].includes(role)) {
        grant('billing', 'view', 'add');
        grant('insurance', 'view');
    }
    if (role === 'accountant') {
        grant('billing', 'delete');
        grant('accounting', 'view', 'add');
    }
    return p;
}
