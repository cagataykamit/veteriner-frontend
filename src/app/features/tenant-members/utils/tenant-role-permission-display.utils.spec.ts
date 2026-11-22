import { translatePermissionGroup } from './tenant-role-permission-display.utils';

/** A-03: Rol yetki özetinde grup başlıkları Türkçe; kod adı ("CashCounts") görünmez. */
describe('translatePermissionGroup', () => {
    it('backend grup adlarını Türkçe başlığa çevirir (büyük harf ve ayraç farkı yok sayılır)', () => {
        expect(translatePermissionGroup('CashCounts', 'Diğer')).toBe('Kasa sayımı');
        expect(translatePermissionGroup('AppointmentRequests', 'Diğer')).toBe('Randevu talepleri');
        expect(translatePermissionGroup('owner_portal', 'Diğer')).toBe('Hasta sahibi portalı');
        expect(translatePermissionGroup('EDocuments', 'Diğer')).toBe('e-Belge');
    });

    it('bilinmeyen grup olduğu gibi, "Diğer" kendisi olarak döner', () => {
        expect(translatePermissionGroup('Yeni', 'Diğer')).toBe('Yeni');
        expect(translatePermissionGroup('Diğer', 'Diğer')).toBe('Diğer');
    });
});
