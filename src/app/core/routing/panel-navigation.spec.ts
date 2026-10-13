import { categoryForUrl, groupForUrl, MENU_GROUPS, REPORT_SECTIONS, SETTINGS_SECTIONS, visibleGroups } from './panel-navigation';

const allClaims = new Set<string>([...MENU_GROUPS, ...SETTINGS_SECTIONS].flatMap((g) => g.entries.flatMap((e) => e.claims ?? [])));
const labels = (groups: { entries: readonly { label: string }[] }[]) => groups.flatMap((g) => g.entries.map((e) => e.label));

describe('panel-navigation', () => {
    it('en geniş izinle başlıklı gruplar Klinik, Para, Stok olur; Panel ve Ayarlar başlıksızdır', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));
        expect(groups.map((g) => g.label)).toEqual([undefined, 'Klinik', 'Para', 'Stok', undefined]);
        expect(labels(groups)).not.toContain('Giriş');
    });

    it('her menü öğesinin simgesi ayrıdır (simge şeridinde öğeler ayırt edilebilir)', () => {
        const icons = MENU_GROUPS.flatMap((g) => g.entries.map((e) => e.icon));
        expect(new Set(icons).size).toBe(icons.length);
    });

    it('sayaç yalnız Bugün ve Lab sonuçları öğelerinde tanımlıdır', () => {
        const badged = MENU_GROUPS.flatMap((g) => g.entries).filter((e) => e.badge);
        expect(badged.map((e) => [e.label, e.badge])).toEqual([
            ['Bugün', 'waitingVisits'],
            ['Lab sonuçları', 'requestedLabResults']
        ]);
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

    it('Ayarlar başlıksız tek öğe olarak en alta sabitlenir; Raporlar Para grubunun altındadır', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));
        const last = groups[groups.length - 1];
        expect(last.pinned).toBeTrue();
        expect(last.label).toBeUndefined();
        expect(labels([last])).toEqual(['Ayarlar']);
        expect(groups.filter((g) => g.pinned)).toHaveSize(1);
        expect(labels([groups.find((g) => g.label === 'Para')!])).toEqual(['Ücretler', 'Ödemeler', 'Raporlar']);
    });

    it('Bugün ve Özet başlıksız ilk grupta, her zaman görünür', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));
        expect(groups[0].label).toBeUndefined();
        expect(labels([groups[0]])).toEqual(['Bugün', 'Özet']);
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

    it('groupForUrl en uzun eşleşen menü yolunun grubunu bulur', () => {
        const label = (url: string) => groupForUrl(MENU_GROUPS, url)?.label;
        expect(label('/panel/pets/abc?tab=1')).toBe('Klinik');
        expect(label('/panel/appointments/calendar')).toBe('Klinik');
        expect(label('/panel/payments')).toBe('Para');
        expect(label('/panel/reports/payments')).toBe('Para');
        expect(label('/panel/stocks#x')).toBe('Stok');
        expect(label('/panel/today')).toBeUndefined();
        expect(groupForUrl(MENU_GROUPS, '/panel/settings/account')?.pinned).toBeTrue();
        expect(groupForUrl(MENU_GROUPS, '/panel/petsx')).toBeUndefined();
    });

    it('her menü grubunun sayfa başlığı kategorisi vardır; başlıklı grupta grup adıdır', () => {
        for (const group of MENU_GROUPS) {
            expect(group.label ?? group.category).toBeTruthy();
            if (group.label) {
                expect(group.category).toBeUndefined();
            }
        }
    });

    it('categoryForUrl menü grubu adını, başlıksız gruplarda kategori adını verir', () => {
        const category = (url: string) => categoryForUrl(MENU_GROUPS, url);
        expect(category('/panel/appointments')).toBe('Klinik');
        expect(category('/panel/appointments/calendar')).toBe('Klinik');
        expect(category('/panel/payments')).toBe('Para');
        expect(category('/panel/reports/appointments')).toBe('Raporlar');
        expect(category('/panel/reports')).toBe('Raporlar');
        expect(category('/panel/products/abc')).toBe('Stok');
        expect(category('/panel/today')).toBe('Panel');
        expect(category('/panel/dashboard')).toBe('Panel');
        expect(category('/panel/settings/clinics')).toBe('Ayarlar');
        expect(category('/panel/administrations')).toBeUndefined();
    });

    it('Rapor Merkezi kartları izne göre süzülür ve gruplanır', () => {
        const all = visibleGroups(REPORT_SECTIONS, () => true);
        expect(all.map((g) => g.label)).toEqual(['Randevu ve ziyaret', 'Klinik', 'Para', 'Kayıt defterleri']);
        expect(labels(all)).toEqual([
            'Randevu Raporu',
            'Muayene Raporu',
            'Aşı Raporu',
            'Ödeme Raporu',
            'Borç Raporu',
            'Muayene Kayıt Defteri',
            'Reçete Kayıt Defteri'
        ]);
        const some = visibleGroups(REPORT_SECTIONS, (c) => c === 'Payments.Read' || c === 'Examinations.Read');
        expect(labels(some)).toEqual(['Muayene Raporu', 'Ödeme Raporu', 'Muayene Kayıt Defteri']);
        expect(labels(visibleGroups(REPORT_SECTIONS, (c) => c === 'Prescriptions.Read'))).toEqual(['Reçete Kayıt Defteri']);
        expect(visibleGroups(REPORT_SECTIONS, () => false)).toEqual([]);
    });
});
