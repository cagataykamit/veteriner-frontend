import {
    categoryForUrl,
    DEFINITION_ENTRIES,
    entryForUrl,
    firstAccessibleRoute,
    flyoutTabsFor,
    groupForUrl,
    listLabelForUrl,
    MANAGER_LEVEL_CLAIM,
    MENU_GROUPS,
    menuLinkRoute,
    REPORT_SECTIONS,
    SETTINGS_SECTIONS,
    tabsForUrl,
    visibleEntries,
    visibleGroups
} from './panel-navigation';
import { PLATFORM_ADMIN_CLAIM } from '@/app/core/auth/operation-claims.constants';

/** Klinik kullanıcısının alabileceği en geniş izin kümesi; platform yöneticisi claim'i izin değildir (ADR-037). */
const allClaims = new Set<string>([...MENU_GROUPS, ...SETTINGS_SECTIONS].flatMap((g) => g.entries.flatMap((e) => e.claims ?? [])).filter((c) => c !== PLATFORM_ADMIN_CLAIM));
const labels = (
    groups: {
        entries: readonly {
            label: string;
        }[];
    }[]
) => groups.flatMap((g) => g.entries.map((e) => e.label));
const only =
    (...claims: string[]) =>
    (c: string) =>
        claims.includes(c);
const entry = (label: string) => MENU_GROUPS.flatMap((g) => g.entries).find((e) => e.label === label)!;

describe('panel-navigation — kayıt defteri kartları', () => {
    const cards = (claims: string[]) => labels(visibleGroups(REPORT_SECTIONS, (c) => claims.includes(c)));

    it('çok izne bağlı kartlar izinlerin hepsi birlikte varsa görünür', () => {
        expect(cards(['StockMovements.Read'])).toEqual(['Aşı Kayıt Defteri', 'İlaç Kayıt Defteri']);
        expect(cards(['StockMovements.Read', 'Administrations.Read'])).toContain('Narkotik ve Psikotropik Defteri');
        expect(cards(['Administrations.Read', 'Vaccinations.Read'])).not.toContain('Aşı Bilgi Raporu');
        expect(cards(['Administrations.Read', 'Vaccinations.Read', 'Products.Read'])).toContain('Aşı Bilgi Raporu');
    });
});

describe('panel-navigation', () => {
    it('en geniş izinle menü ADR-023 bölümlerindedir; Yönetim bölümü (Ayarlar dahil) en alta sabitlenir', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));

        expect(groups.map((g) => [g.heading, labels([g])])).toEqual([
            ['Günlük iş', ['Bugün', 'Randevular']],
            ['Müşteri ve hasta', ['Müşteri ve Hasta']],
            ['Klinik', ['Kayıtlar']],
            ['Para ve stok', ['Para', 'Stok']],
            ['Yönetim', ['Raporlar', 'Özet', 'Ayarlar']]
        ]);
        expect(groups.every((g) => g.label === undefined)).toBe(true);
        const last = groups[groups.length - 1];

        expect(last.pinned).toBe(true);
        expect(groups.filter((g) => g.pinned)).toHaveLength(1);
    });

    it('tüm girişleri izinle gizlenen bölüm başlığıyla birlikte düşer', () => {
        const headings = (hasClaim: (c: string) => boolean) => visibleGroups(MENU_GROUPS, hasClaim).map((g) => g.heading);

        expect(headings(() => false)).toEqual(['Yönetim']);
        expect(headings(only('Pets.Read'))).toEqual(['Müşteri ve hasta', 'Yönetim']);
        expect(headings(only('Appointments.Read', 'Products.Read'))).toEqual(['Günlük iş', 'Para ve stok', 'Yönetim']);
    });

    it('her menü öğesinin simgesi ayrıdır (simge şeridinde öğeler ayırt edilebilir)', () => {
        const icons = MENU_GROUPS.flatMap((g) => g.entries.map((e) => e.icon));

        expect(new Set(icons).size).toBe(icons.length);
    });

    it('sayaç yalnız Bugün ve Kayıtlar öğelerinde, Kayıtlar altında Lab sekmesinde tanımlıdır', () => {
        const badged = MENU_GROUPS.flatMap((g) => g.entries).filter((e) => e.badge);

        expect(badged.map((e) => [e.label, e.badge])).toEqual([
            ['Bugün', 'waitingVisits'],
            ['Kayıtlar', 'requestedLabResults']
        ]);
        const tabBadges = entry('Kayıtlar').tabs!.filter((t) => t.badge);

        expect(tabBadges.map((t) => [t.label, t.badge])).toEqual([['Lab sonuçları', 'requestedLabResults']]);
    });

    it('birleşik öğelerin sekmeleri mevcut liste rotalarıdır', () => {
        const tabs = (label: string) => entry(label).tabs!.map((t) => [t.label, t.route]);

        expect(tabs('Müşteri ve Hasta')).toEqual([
            ['Ara', '/panel/patients'],
            ['Müşteriler', '/panel/clients'],
            ['Hastalar', '/panel/pets']
        ]);
        expect(tabs('Randevular')).toEqual([
            ['Liste', '/panel/appointments'],
            ['Takvim', '/panel/appointments/calendar']
        ]);
        expect(tabs('Para')).toEqual([
            ['Ücretler', '/panel/charges'],
            ['Ücret bekleyenler', '/panel/charges/pending'],
            ['Ödemeler', '/panel/payments'],
            ['Satışlar', '/panel/sales']
        ]);
        expect(tabs('Stok').map(([l]) => l)).toEqual(['Ürünler', 'Stok durumu', 'Stok hareketleri', 'Mal kabul']);
        expect(tabs('Kayıtlar').map(([l]) => l)).toEqual(['Muayeneler', 'Tedaviler', 'Reçeteler', 'Aşılar', 'Lab sonuçları', 'Görüntüleme', 'Yatışlar', 'Uygulamalar']);
    });

    it('Tür, Irk ve Kategori ana menüde yer almaz', () => {
        const groups = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));

        expect(labels(groups)).not.toContain('Türler');
        expect(labels(groups)).not.toContain('Irklar');
        expect(labels(groups)).not.toContain('Kategoriler');
    });

    it('Satış ortakları, Deneme ölçümleri ve Çift ödemeler yalnız platform yöneticisine, Yönetim bölümünde görünür (ADR-037, TRIAL-008)', () => {
        const clinic = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c));
        const platform = visibleGroups(MENU_GROUPS, (c) => allClaims.has(c) || c === PLATFORM_ADMIN_CLAIM);

        expect(labels(clinic)).not.toContain('Satış ortakları');
        expect(labels(clinic)).not.toContain('Deneme ölçümleri');
        expect(labels(clinic)).not.toContain('Çift ödemeler');
        expect(platform.find((g) => g.heading === 'Yönetim')!.entries.map((e) => e.label)).toEqual(['Raporlar', 'Özet', 'Satış ortakları', 'Deneme ölçümleri', 'Çift ödemeler', 'Ayarlar']);
        expect(entryForUrl(MENU_GROUPS, '/panel/sales-partners/p1')?.label).toBe('Satış ortakları');
        expect(entryForUrl(MENU_GROUPS, '/panel/trial-metrics')?.label).toBe('Deneme ölçümleri');
        expect(entryForUrl(MENU_GROUPS, '/panel/duplicate-payments')?.label).toBe('Çift ödemeler');
    });

    it('izin yoksa yalnız Ayarlar kalır; Özet yalnız yönetici düzeyi izniyle görünür', () => {
        expect(labels(visibleGroups(MENU_GROUPS, () => false))).toEqual(['Ayarlar']);
        expect(labels(visibleGroups(MENU_GROUPS, only(MANAGER_LEVEL_CLAIM)))).toEqual(['Özet', 'Ayarlar']);
    });

    it('Bugün yalnız Visits.Read ile görünür; birleşik öğe en az bir sekmesi yetkiliyse görünür', () => {
        const groups = visibleGroups(MENU_GROUPS, only('Visits.Read', 'Clients.Read'));

        expect(labels(groups)).toEqual(['Bugün', 'Müşteri ve Hasta', 'Raporlar', 'Ayarlar']);
    });

    it('menü bağlantısı yetkili ilk sekmeye açılır', () => {
        expect(menuLinkRoute(entry('Müşteri ve Hasta'), () => true)).toBe('/panel/patients');
        expect(menuLinkRoute(entry('Müşteri ve Hasta'), only('Pets.Read'))).toBe('/panel/patients');
        expect(menuLinkRoute(entry('Randevular'), only('Appointments.Read'))).toBe('/panel/appointments');
        expect(menuLinkRoute(entry('Stok'), only('StockMovements.Read'))).toBe('/panel/stock-movements');
        expect(menuLinkRoute(entry('Bugün'), () => true)).toBe('/panel/today');
    });

    it('Ayarlar kartları izne göre süzülür; Tanımlar yalnız tanım izni varken görünür', () => {
        const none = labels(visibleGroups(SETTINGS_SECTIONS, () => false));

        expect(none).toEqual(['Hesabım']);
        const withCategory = labels(visibleGroups(SETTINGS_SECTIONS, (c) => c === 'ProductCategories.Read'));

        expect(withCategory).toEqual(['Hesabım', 'Tanımlar']);
    });

    it('sözlük kartı Tanımlar altında yönetim izniyle görünür; yalnız okuma izni kart açmaz', () => {
        expect(visibleEntries(DEFINITION_ENTRIES, only('ClinicalTerms.Read'))).toEqual([]);
        expect(visibleEntries(DEFINITION_ENTRIES, only('ClinicalTerms.Create')).map((e) => e.route)).toEqual(['/panel/settings/definitions/clinical-terms']);
        expect(labels(visibleGroups(SETTINGS_SECTIONS, only('ClinicalTerms.Deactivate')))).toContain('Tanımlar');
        expect(labels(visibleGroups(MENU_GROUPS, only('ClinicalTerms.Create')))).toEqual(['Ayarlar']);
    });

    it('muayene şablonları kartı Tanımlar altında yönetim izniyle görünür; okuma/uygulama izni kart açmaz', () => {
        expect(visibleEntries(DEFINITION_ENTRIES, only('ExaminationTemplates.Read', 'ExaminationTemplates.Apply'))).toEqual([]);
        expect(visibleEntries(DEFINITION_ENTRIES, only('ExaminationTemplates.Update')).map((e) => e.route)).toEqual(['/panel/settings/definitions/examination-templates']);
        expect(labels(visibleGroups(SETTINGS_SECTIONS, only('ExaminationTemplates.Deactivate')))).toContain('Tanımlar');
    });

    it('Veri içe aktarma kartı Ayarlar altında yalnız Imports.Read ile görünür; menüye öğe eklenmez', () => {
        expect(labels(visibleGroups(SETTINGS_SECTIONS, () => false))).not.toContain('Veri içe aktarma');
        expect(labels(visibleGroups(SETTINGS_SECTIONS, only('Imports.Read')))).toContain('Veri içe aktarma');
        expect(labels(visibleGroups(MENU_GROUPS, only('Imports.Read')))).toEqual(['Ayarlar']);
    });

    it('KVKK metinleri kartı Ayarlar altında yalnız Clinics.Update ile görünür; menüye öğe eklenmez', () => {
        expect(labels(visibleGroups(SETTINGS_SECTIONS, only('Clinics.Read', 'Clients.Read')))).not.toContain('KVKK metinleri');
        expect(labels(visibleGroups(SETTINGS_SECTIONS, only('Clinics.Update')))).toContain('KVKK metinleri');
        expect(labels(visibleGroups(MENU_GROUPS, only('Clinics.Update')))).toEqual(['Ayarlar']);
        expect(listLabelForUrl('/panel/settings/kvkk-form')).toBe('KVKK metinleri');
    });

    it('menüde tek Raporlar girişi vardır; ayrı rapor öğeleri yoktur', () => {
        const all = labels(visibleGroups(MENU_GROUPS, (c) => allClaims.has(c)));

        expect(all.filter((l) => l === 'Raporlar')).toHaveLength(1);
        expect(all.filter((l) => l.endsWith('Raporu'))).toEqual([]);
    });

    it('Raporlar girişi herhangi bir rapor izniyle görünür, hiçbiriyle görünmez', () => {
        expect(labels(visibleGroups(MENU_GROUPS, (c) => c === 'Vaccinations.Read'))).toContain('Raporlar');
        expect(labels(visibleGroups(MENU_GROUPS, () => false))).not.toContain('Raporlar');
    });

    it('firstAccessibleRoute menü sırasıyla ilk yetkili öğenin yolunu verir', () => {
        expect(firstAccessibleRoute(MENU_GROUPS, () => true)).toBe('/panel/today');
        expect(firstAccessibleRoute(MENU_GROUPS, only('Clients.Read', 'Pets.Read'))).toBe('/panel/patients');
        expect(firstAccessibleRoute(MENU_GROUPS, only(MANAGER_LEVEL_CLAIM, 'Pets.Read'))).toBe('/panel/patients');
        expect(firstAccessibleRoute(MENU_GROUPS, only(MANAGER_LEVEL_CLAIM))).toBe('/panel/dashboard');
        expect(firstAccessibleRoute(MENU_GROUPS, () => false)).toBe('/panel/settings');
    });

    it('entryForUrl sekme adreslerini ve alt yollarını birleşik öğeye bağlar', () => {
        const label = (url: string) => entryForUrl(MENU_GROUPS, url)?.label;

        expect(label('/panel/pets/abc?tab=1')).toBe('Müşteri ve Hasta');
        expect(label('/panel/clients?x=1')).toBe('Müşteri ve Hasta');
        expect(label('/panel/patients')).toBe('Müşteri ve Hasta');
        expect(label('/panel/appointments/calendar')).toBe('Randevular');
        expect(label('/panel/appointments/new')).toBe('Randevular');
        expect(label('/panel/administrations')).toBe('Kayıtlar');
        expect(label('/panel/reports/payments')).toBe('Raporlar');
        expect(label('/panel/petsx')).toBeUndefined();
    });

    it('groupForUrl menüde olmayan adres için undefined, Ayarlar için sabitlenen grubu verir', () => {
        expect(groupForUrl(MENU_GROUPS, '/panel/today')?.label).toBeUndefined();
        expect(groupForUrl(MENU_GROUPS, '/panel/today')?.pinned).toBeUndefined();
        expect(groupForUrl(MENU_GROUPS, '/panel/settings/account')?.pinned).toBe(true);
        expect(groupForUrl(MENU_GROUPS, '/panel/petsx')).toBeUndefined();
    });

    it('her menü öğesinin sayfa başlığı kategorisi vardır; bölüm başlığı kategori olarak kullanılmaz', () => {
        for (const group of MENU_GROUPS) {
            for (const item of group.entries) {
                const category = categoryForUrl(MENU_GROUPS, item.route);

                expect(category, item.label).toBeTruthy();
                expect(category).not.toBe(group.heading);
            }
        }
    });

    it('categoryForUrl öğenin adını, kategorisiz öğede grup kategorisini verir', () => {
        const category = (url: string) => categoryForUrl(MENU_GROUPS, url);

        expect(category('/panel/appointments')).toBe('Randevular');
        expect(category('/panel/appointments/calendar')).toBe('Randevular');
        expect(category('/panel/payments')).toBe('Para');
        expect(category('/panel/pets/abc')).toBe('Müşteri ve Hasta');
        expect(category('/panel/examinations')).toBe('Kayıtlar');
        expect(category('/panel/reports/appointments')).toBe('Raporlar');
        expect(category('/panel/reports')).toBe('Raporlar');
        expect(category('/panel/products/abc')).toBe('Stok');
        expect(category('/panel/today')).toBe('Panel');
        expect(category('/panel/dashboard')).toBe('Panel');
        expect(category('/panel/settings/clinics')).toBe('Ayarlar');
        expect(category('/panel/yok')).toBeUndefined();
    });

    it('listLabelForUrl adresin tam karşılığı olan liste adını verir; genel sekme adları yerine liste adı', () => {
        expect(listLabelForUrl('/panel/pets?clientId=c1')).toBe('Hastalar');
        expect(listLabelForUrl('/panel/patients')).toBe('Hastalar');
        expect(listLabelForUrl('/panel/appointments')).toBe('Randevular');
        expect(listLabelForUrl('/panel/examinations')).toBe('Muayeneler');
        expect(listLabelForUrl('/panel/today')).toBe('Bugün');
        expect(listLabelForUrl('/panel/settings')).toBe('Ayarlar');
        expect(listLabelForUrl('/panel/settings/clinics')).toBe('Klinikler');
        expect(listLabelForUrl('/panel/settings/definitions/breeds')).toBe('Irklar');
        expect(listLabelForUrl('/panel/pets/abc')).toBeUndefined();
    });

    describe('sekme çubuğu', () => {
        const tabs = (url: string, hasClaim: (c: string) => boolean = () => true) => tabsForUrl(MENU_GROUPS, url, hasClaim);

        it('liste adresinde yetkili sekmeleri ve etkin sekmeyi verir; sorgu süzgeci etkin sekmeyi değiştirmez', () => {
            expect(tabs('/panel/pets?clientId=c1')?.tabs.map((t) => t.label)).toEqual(['Ara', 'Müşteriler', 'Hastalar']);
            expect(tabs('/panel/pets?clientId=c1')?.active.label).toBe('Hastalar');
            expect(tabs('/panel/appointments/calendar')?.active.label).toBe('Takvim');
            expect(tabs('/panel/administrations')?.tabs).toHaveLength(8);
            expect(tabs('/panel/imaging')?.active.label).toBe('Görüntüleme');
        });

        it('detay, form ve menüde olmayan adreslerde çubuk çıkmaz', () => {
            expect(tabs('/panel/pets/abc')).toBeUndefined();
            expect(tabs('/panel/examinations/new')).toBeUndefined();
            expect(tabs('/panel/appointments/new')).toBeUndefined();
            expect(tabs('/panel/today')).toBeUndefined();
            expect(tabs('/panel/reports')).toBeUndefined();
        });

        it('yetkisiz sekme görünmez; tek sekme kalırsa çubuk çıkmaz', () => {
            expect(tabs('/panel/stocks', only('Products.Read'))?.tabs.map((t) => t.label)).toEqual(['Ürünler', 'Stok durumu']);
            expect(tabs('/panel/stocks', only('Products.Read', 'StockMovements.Create'))?.tabs.map((t) => t.label)).toEqual(['Ürünler', 'Stok durumu', 'Mal kabul']);
            expect(tabs('/panel/clients', only('Clients.Read'))?.tabs.map((t) => t.label)).toEqual(['Ara', 'Müşteriler']);
            expect(tabs('/panel/patients', only('Pets.Read'))?.tabs.map((t) => t.label)).toEqual(['Ara', 'Hastalar']);
            expect(tabs('/panel/pets', only('Clients.Read'))).toBeUndefined();
        });

        it('Satışlar sekmesi yalnız Sales.Read ile görünür; satış detay ve hızlı satış adreslerinde çubuk çıkmaz', () => {
            expect(tabs('/panel/payments', only('Payments.Read', 'Sales.Read'))?.tabs.map((t) => t.label)).toEqual(['Ödemeler', 'Satışlar']);
            expect(tabs('/panel/payments', only('Charges.Read', 'Payments.Read'))?.tabs.map((t) => t.label)).toEqual(['Ücretler', 'Ücret bekleyenler', 'Ödemeler']);
            expect(tabs('/panel/charges/pending', only('Charges.Read', 'Payments.Read'))?.active.label).toBe('Ücret bekleyenler');
            expect(tabs('/panel/sales', only('Sales.Read'))).toBeUndefined();
            expect(tabs('/panel/sales/new')).toBeUndefined();
            expect(tabs('/panel/sales/abc')).toBeUndefined();
            expect(labels(visibleGroups(MENU_GROUPS, only('Sales.Read')))).toEqual(['Para', 'Ayarlar']);
            expect(labels(visibleGroups(MENU_GROUPS, only('Sales.Create')))).toEqual(['Ayarlar']);
        });
    });

    describe('alt sayfa paneli (flyout)', () => {
        const flyout = (label: string, url: string, hasClaim: (c: string) => boolean = () => true) => flyoutTabsFor(entry(label), url, hasClaim);

        it('sekmeli öğede yetkili sekmeleri verir; sekmesiz öğede ve tek sekme yetkiliyken panel yoktur', () => {
            expect(flyout('Kayıtlar', '/panel/today')?.tabs.map((t) => t.label)).toEqual(['Muayeneler', 'Tedaviler', 'Reçeteler', 'Aşılar', 'Lab sonuçları', 'Görüntüleme', 'Yatışlar', 'Uygulamalar']);
            expect(flyout('Stok', '/panel/today', only('Products.Read'))?.tabs.map((t) => t.label)).toEqual(['Ürünler', 'Stok durumu']);
            expect(flyout('Stok', '/panel/today', only('StockMovements.Read'))).toBeUndefined();
            expect(flyout('Bugün', '/panel/today')).toBeUndefined();
            expect(flyout('Ayarlar', '/panel/settings')).toBeUndefined();
        });

        it('etkin sekme adresi kapsayan en uzun sekme yoludur; detay sayfasında listesinin sekmesi, başka öğenin adresinde yok', () => {
            expect(flyout('Para', '/panel/charges/pending?x=1')?.active?.label).toBe('Ücret bekleyenler');
            expect(flyout('Para', '/panel/charges')?.active?.label).toBe('Ücretler');
            expect(flyout('Randevular', '/panel/appointments/calendar')?.active?.label).toBe('Takvim');
            expect(flyout('Randevular', '/panel/appointments/abc')?.active?.label).toBe('Liste');
            expect(flyout('Müşteri ve Hasta', '/panel/pets/abc')?.active?.label).toBe('Hastalar');
            expect(flyout('Müşteri ve Hasta', '/panel/today')?.active).toBeUndefined();
        });
    });

    it('Rapor Merkezi kartları izne göre süzülür ve gruplanır', () => {
        const all = visibleGroups(REPORT_SECTIONS, () => true);

        expect(all.map((g) => g.label)).toEqual(['Randevu ve ziyaret', 'Klinik', 'Para', 'Kayıt defterleri', 'HBS takibi']);
        expect(labels(all)).toEqual([
            'Randevu Raporu',
            'Muayene Raporu',
            'Aşı Raporu',
            'Gün sonu',
            'Ödeme Raporu',
            'Borç Raporu',
            'Muayene Kayıt Defteri',
            'Reçete Kayıt Defteri',
            'Aşı Kayıt Defteri',
            'İlaç Kayıt Defteri',
            'Narkotik ve Psikotropik Defteri',
            'Aşı Bilgi Raporu',
            'HBS takibi — reçeteler',
            'HBS takibi — aşılar'
        ]);
        const some = visibleGroups(REPORT_SECTIONS, (c) => c === 'Payments.Read' || c === 'Examinations.Read');

        expect(labels(some)).toEqual(['Muayene Raporu', 'Gün sonu', 'Ödeme Raporu', 'Muayene Kayıt Defteri']);
        expect(labels(visibleGroups(REPORT_SECTIONS, (c) => c === 'Visits.Read'))).toEqual(['Gün sonu']);
        expect(labels(visibleGroups(REPORT_SECTIONS, (c) => c === 'Charges.Read'))).toEqual(['Borç Raporu']);
        expect(labels(visibleGroups(REPORT_SECTIONS, (c) => c === 'Prescriptions.Read'))).toEqual(['Reçete Kayıt Defteri', 'HBS takibi — reçeteler']);
        expect(labels(visibleGroups(REPORT_SECTIONS, (c) => c === 'Vaccinations.Read'))).toEqual(['Aşı Raporu', 'HBS takibi — aşılar']);
        expect(visibleGroups(REPORT_SECTIONS, () => false)).toEqual([]);
    });
});
