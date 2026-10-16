import { panelHomeRoute } from '@/app/core/routing/panel-home.redirect';

/** Rol izinlerinin açılışı belirleyen kısmı (backend `RolePermissionBindings`); Özet'in okuma izni tüm rollerde vardır, ayırt etmez. */
const ROLE_CLAIMS = {
    manager: ['Dashboard.Read', 'Visits.Read', 'Visits.Correct', 'Appointments.Create', 'Clients.Read', 'Pets.Read'],
    receptionist: ['Dashboard.Read', 'Visits.Read', 'Appointments.Create', 'Clients.Read', 'Pets.Read'],
    veterinarian: ['Dashboard.Read', 'Visits.Read', 'Appointments.Create', 'Examinations.Create', 'Clients.Read', 'Pets.Read']
};

const only = (...claims: string[]) => (claim: string) => claims.includes(claim);

describe('panelHomeRoute (ADR-030)', () => {
    it('yönetici düzeyi Özet ile açılır', () => {
        expect(panelHomeRoute(only(...ROLE_CLAIMS.manager))).toBe('/panel/dashboard');
    });

    it('Resepsiyon ve Hekim Bugün ile açılır', () => {
        expect(panelHomeRoute(only(...ROLE_CLAIMS.receptionist))).toBe('/panel/today');
        expect(panelHomeRoute(only(...ROLE_CLAIMS.veterinarian))).toBe('/panel/today');
    });

    it('yalnız Bugün yetkisi olan Bugün ile açılır', () => {
        expect(panelHomeRoute(only('Visits.Read'))).toBe('/panel/today');
    });

    it('Bugün yetkisi olmayan yönetici Özet ile açılır', () => {
        expect(panelHomeRoute(only('Visits.Correct'))).toBe('/panel/dashboard');
    });

    it('Bugün ve Özet yetkisi yoksa menüdeki ilk erişilebilir öğe, o da yoksa Ayarlar', () => {
        expect(panelHomeRoute(only('Clients.Read', 'Pets.Read'))).toBe('/panel/patients');
        expect(panelHomeRoute(() => false)).toBe('/panel/settings');
    });
});
