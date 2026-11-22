import { tenantRoleLabel } from './tenant-role-labels';

describe('tenantRoleLabel', () => {
    it.each([
        ['Admin', 'İşletme yöneticisi'],
        ['ClinicAdmin', 'Klinik yöneticisi'],
        ['clinic admin', 'Klinik yöneticisi'],
        ['Veteriner', 'Hekim'],
        ['Sekreter', 'Sekreter'],
        ['Özel rol', 'Özel rol'],
        [null, '']
    ])('%s → %s', (raw, expected) => {
        expect(tenantRoleLabel(raw)).toBe(expected);
    });
});
