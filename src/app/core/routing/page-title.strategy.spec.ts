import { resolvePanelPageTitle } from './page-title.strategy';

describe('resolvePanelPageTitle', () => {
    it('panel sayfa adlarını çözer', () => {
        expect(resolvePanelPageTitle('/panel/examinations')).toBe('Muayeneler');
        expect(resolvePanelPageTitle('/panel/examinations/abc-123?page=2')).toBe('Muayeneler');
        expect(resolvePanelPageTitle('/panel/today')).toBe('Bugün');
        expect(resolvePanelPageTitle('/panel/settings/clinics/xyz')).toBe('Klinikler');
    });

    it('en uzun önek kazanır (takvim, rapor)', () => {
        expect(resolvePanelPageTitle('/panel/appointments/calendar')).toBe('Randevu Takvimi');
        expect(resolvePanelPageTitle('/panel/appointments/new')).toBe('Randevular');
        expect(resolvePanelPageTitle('/panel/reports/payments')).toBe('Ödeme Raporu');
    });

    it('panel dışı ve bilinmeyen yol için null (başlığa dokunulmaz)', () => {
        expect(resolvePanelPageTitle('/auth/login')).toBeNull();
        expect(resolvePanelPageTitle('/pricing')).toBeNull();
        expect(resolvePanelPageTitle('/panel/bilinmeyen')).toBeNull();
    });
});
