import { MENU_GROUPS, REPORT_SECTIONS, SETTINGS_SECTIONS, visibleGroups } from './panel-navigation';

const allClaims = new Set<string>([...MENU_GROUPS, ...SETTINGS_SECTIONS].flatMap((g) => g.entries.flatMap((e) => e.claims ?? [])));
const labels = (groups: { entries: readonly { label: string }[] }[]) => groups.flatMap((g) => g.entries.map((e) => e.label));

describe('panel-navigation', () => {
    it('en geniş izinle altı grup görünür ve Giriş öğesi yoktur', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));
        expect(groups.map((g) => g.label)).toEqual(['Panel', 'Klinik', 'Para', 'Stok', 'Raporlar', 'Ayarlar']);
        expect(labels(groups)).not.toContain('Giriş');
    });

    it('Tür, Irk ve Kategori ana menüde yer almaz', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));
        expect(labels(groups)).not.toContain('Türler');
        expect(labels(groups)).not.toContain('Irklar');
        expect(labels(groups)).not.toContain('Kategoriler');
    });

    it('izin yoksa yalnız herkese açık öğeler kalır', () => {
        const groups = visibleGroups(MENU_GROUPS, () => false);
        expect(labels(groups)).toEqual(['Özet', 'Ayarlar']);
    });

    it('Bugün yalnız Visits.Read ile görünür; izni olmayan öğeler çıkmaz', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => c === 'Visits.Read' || c === 'Clients.Read');
        expect(labels(groups)).toEqual(['Bugün', 'Özet', 'Müşteriler', 'Ayarlar']);
    });

    it('Ayarlar kartları izne göre süzülür; Tanımlar yalnız tanım izni varken görünür', () => {
        const none = labels(visibleGroups(SETTINGS_SECTIONS, () => false));
        expect(none).toEqual(['Hesabım']);
        const withCategory = labels(visibleGroups(SETTINGS_SECTIONS, (c) => c === 'ProductCategories.Read'));
        expect(withCategory).toEqual(['Hesabım', 'Tanımlar']);
    });

    it('menüde tek Raporlar girişi vardır; ayrı rapor öğeleri yoktur', () => {
        const all = labels(visibleGroups(MENU_GROUPS, (c) => allClaims.has(c)));
        expect(all.filter((l) => l === 'Raporlar')).toHaveSize(1);
        expect(all.filter((l) => l.endsWith('Raporu'))).toEqual([]);
    });

    it('Raporlar girişi herhangi bir rapor izniyle görünür, hiçbiriyle görünmez', () => {
        expect(labels(visibleGroups(MENU_GROUPS, (c) => c === 'Vaccinations.Read'))).toContain('Raporlar');
        expect(labels(visibleGroups(MENU_GROUPS, () => false))).not.toContain('Raporlar');
    });

    it('Rapor Merkezi kartları izne göre süzülür ve gruplanır', () => {
        const all = visibleGroups(REPORT_SECTIONS, () => true);
        expect(all.map((g) => g.label)).toEqual(['Randevu ve ziyaret', 'Klinik', 'Para']);
        expect(labels(all)).toEqual(['Randevu Raporu', 'Muayene Raporu', 'Aşı Raporu', 'Ödeme Raporu']);
        const some = visibleGroups(REPORT_SECTIONS, (c) => c === 'Payments.Read' || c === 'Examinations.Read');
        expect(labels(some)).toEqual(['Muayene Raporu', 'Ödeme Raporu']);
        expect(visibleGroups(REPORT_SECTIONS, () => false)).toEqual([]);
    });
});
