import { panelHomeRoute } from '@/app/core/routing/panel-home.redirect';

/** Rol izinlerinin açılışı belirleyen kısmı (backend `RolePermissionBindings`). */
const ROLE_CLAIMS = {
    manager: ['Visits.Read', 'Visits.Correct', 'Appointments.Create', 'Clients.Read', 'Pets.Read'],
    receptionist: ['Visits.Read', 'Appointments.Create', 'Clients.Read', 'Pets.Read'],
    veterinarian: ['Visits.Read', 'Appointments.Create', 'Examinations.Create', 'Clients.Read', 'Pets.Read']
};

const only = (...claims: string[]) => (claim: string) => claims.includes(claim);

describe('panelHomeRoute (ADR-030 eki 2026-11-04, ADR-052 K2)', () => {
    it('yönetici, Resepsiyon ve Hekim Bugün ile açılır', () => {
        expect(panelHomeRoute(only(...ROLE_CLAIMS.manager))).toBe('/panel/today');
        expect(panelHomeRoute(only(...ROLE_CLAIMS.receptionist))).toBe('/panel/today');
        expect(panelHomeRoute(only(...ROLE_CLAIMS.veterinarian))).toBe('/panel/today');
    });

    it('Bugün yetkisi yoksa ve bir rapor açılabiliyorsa Raporlar ile açılır (Özet kaldırıldı)', () => {
        expect(panelHomeRoute(only('Visits.Correct'))).toBe('/panel/reports');
        expect(panelHomeRoute(only('Payments.Read', 'Clients.Read'))).toBe('/panel/reports');
    });

    it('Bugün ve rapor yetkisi yoksa menüdeki ilk erişilebilir öğe, o da yoksa Ayarlar', () => {
        expect(panelHomeRoute(only('Clients.Read', 'Pets.Read'))).toBe('/panel/patients');
        expect(panelHomeRoute(() => false)).toBe('/panel/settings');
    });

    it('kliniksiz platform yöneticisi (yalnız platform_admin) Satış ortakları ile açılır', () => {
        expect(panelHomeRoute(only('platform_admin'))).toBe('/panel/sales-partners');
    });
});
