import {
    ADMINISTRATIONS_READ_CLAIM,
    APPOINTMENTS_READ_CLAIM,
    BREEDS_CREATE_CLAIM,
    BREEDS_UPDATE_CLAIM,
    CHARGES_READ_CLAIM,
    CLIENTS_READ_CLAIM,
    CLINICS_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    HOSPITALIZATIONS_READ_CLAIM,
    LAB_RESULTS_READ_CLAIM,
    PAYMENTS_READ_CLAIM,
    PETS_READ_CLAIM,
    PRESCRIPTIONS_READ_CLAIM,
    PRODUCT_CATEGORIES_READ_CLAIM,
    PRODUCTS_READ_CLAIM,
    REMINDERS_READ_CLAIM,
    SALES_READ_CLAIM,
    SPECIES_CREATE_CLAIM,
    SPECIES_UPDATE_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM,
    SUBSCRIPTIONS_MANAGE_CLAIM,
    SUBSCRIPTIONS_READ_CLAIM,
    TENANT_MANAGEMENT_CLAIM,
    TREATMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM,
    VISITS_CORRECT_CLAIM,
    VISITS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';

/**
 * Panel gezinti kaydı: kenar menü, Ayarlar ve Tanımlar sayfaları öğe, rota ve izin bilgisini buradan okur.
 * Yeni özellik otomatik menü öğesi olmaz; önce mevcut bir akışa girip girmeyeceği değerlendirilir (ADR-004).
 */
export interface NavigationEntry {
    readonly label: string;
    readonly route: string;
    /** İzinlerden herhangi biri yeterli (`requireAllClaims` ise hepsi gerekir); boş veya yoksa herkese açık. */
    readonly claims?: readonly string[];
    /** `claims` listesindeki izinlerin hepsi birlikte gerekir (ör. çok izne bağlı defterler). */
    readonly requireAllClaims?: boolean;
}

/** Menüde öğenin yanında bekleyen iş sayısı gösterilen sayaçlar; değerlerini `MenuBadgeService` sağlar. */
export type MenuBadgeKey = 'waitingVisits' | 'requestedLabResults';

/** Birleşik menü öğesinin sekmesi: mevcut liste sayfasının rotası; yetkisi olmayan sekme görünmez. */
export interface MenuTab extends NavigationEntry {
    readonly badge?: MenuBadgeKey;
}

export interface MenuEntry extends NavigationEntry {
    /** Öğenin yanında gösterilecek bekleyen iş sayacı; 0 iken gizlenir. */
    readonly badge?: MenuBadgeKey;
    /** Sayacın ne saydığı (ipucu ve ekran okuyucu için); yoksa "bekleyen". */
    readonly badgeText?: string;
    /** Birleşik öğe: sekmeler mevcut liste rotalarıdır; öğe yetkili ilk sekmeye açılır, tek sekme kalırsa sekme çubuğu çıkmaz. */
    readonly tabs?: readonly MenuTab[];
    readonly icon: string;
    /** Sayfa başlığı üstündeki etiket; yoksa grubun adı/kategorisi kullanılır (ör. Para altındaki Raporlar). */
    readonly category?: string;
}

export interface MenuGroup {
    /** Yoksa grup başlıksızdır: öğeleri her zaman görünür, açılıp kapanmaz. */
    readonly label?: string;
    /** Başlıksız grubun sayfa başlığı üstündeki kategori adı; başlıklı grupta `label` kullanılır. */
    readonly category?: string;
    readonly entries: readonly MenuEntry[];
    /** Kullanıcı tercihi yokken açık başlar; aktif rotanın grubu her zaman açılır. */
    readonly defaultOpen?: boolean;
    /** Menünün en altına sabitlenir. */
    readonly pinned?: boolean;
}

export interface CardEntry extends NavigationEntry {
    readonly icon: string;
    readonly description: string;
}

export interface CardSection {
    readonly label: string;
    readonly entries: readonly CardEntry[];
}

export const SETTINGS_ROUTE = '/panel/settings';
export const DEFINITIONS_ROUTE = '/panel/settings/definitions';
export const SPECIES_ROUTE = `${DEFINITIONS_ROUTE}/species`;
export const BREEDS_ROUTE = `${DEFINITIONS_ROUTE}/breeds`;
export const PRODUCT_CATEGORIES_ROUTE = `${DEFINITIONS_ROUTE}/product-categories`;
export const REPORTS_ROUTE = '/panel/reports';

/** Rapor Merkezi kartları; menüde tek "Raporlar" girişi vardır (ADR-003). Yeni rapor buraya kart olarak eklenir. */
export const REPORT_SECTIONS: readonly CardSection[] = [
    {
        label: 'Randevu ve ziyaret',
        entries: [
            {
                label: 'Randevu Raporu',
                icon: 'pi pi-fw pi-calendar-plus',
                route: `${REPORTS_ROUTE}/appointments`,
                claims: [APPOINTMENTS_READ_CLAIM],
                description: 'Randevular ve durum dağılımı; Gelmedi sayısı.'
            }
        ]
    },
    {
        label: 'Klinik',
        entries: [
            {
                label: 'Muayene Raporu',
                icon: 'pi pi-fw pi-file-edit',
                route: `${REPORTS_ROUTE}/examinations`,
                claims: [EXAMINATIONS_READ_CLAIM],
                description: 'Yapılan muayeneler.'
            },
            {
                label: 'Aşı Raporu',
                icon: 'pi pi-fw pi-shield',
                route: `${REPORTS_ROUTE}/vaccinations`,
                claims: [VACCINATIONS_READ_CLAIM],
                description: 'Planlanan ve uygulanan aşılar.'
            }
        ]
    },
    {
        label: 'Para',
        entries: [
            {
                label: 'Gün sonu',
                icon: 'pi pi-fw pi-moon',
                route: `${REPORTS_ROUTE}/end-of-day`,
                claims: [PAYMENTS_READ_CLAIM, VISITS_READ_CLAIM],
                description: 'Günün ücret, tahsilat ve açık işleri; işlem dökümü ve yazdırma.'
            },
            {
                label: 'Ödeme Raporu',
                icon: 'pi pi-fw pi-file-export',
                route: `${REPORTS_ROUTE}/payments`,
                claims: [PAYMENTS_READ_CLAIM],
                description: 'Tahsilatlar ve ödeme yöntemine göre toplam.'
            },
            {
                label: 'Borç Raporu',
                icon: 'pi pi-fw pi-wallet',
                route: `${REPORTS_ROUTE}/outstanding-balances`,
                claims: [CHARGES_READ_CLAIM],
                description: 'Müşterilerin şu anki kalan borcu.'
            }
        ]
    },
    {
        label: 'Kayıt defterleri',
        entries: [
            {
                label: 'Muayene Kayıt Defteri',
                icon: 'pi pi-fw pi-book',
                route: `${REPORTS_ROUTE}/registers/examinations`,
                claims: [EXAMINATIONS_READ_CLAIM],
                description: 'Hayvan muayene kayıt defteri; yazdırma ve dışa aktarma.'
            },
            {
                label: 'Reçete Kayıt Defteri',
                icon: 'pi pi-fw pi-book',
                route: `${REPORTS_ROUTE}/registers/prescriptions`,
                claims: [PRESCRIPTIONS_READ_CLAIM],
                description: 'Reçete kayıt defteri; yazdırma ve dışa aktarma.'
            },
            {
                label: 'Aşı Kayıt Defteri',
                icon: 'pi pi-fw pi-book',
                route: `${REPORTS_ROUTE}/registers/vaccines`,
                claims: [STOCK_MOVEMENTS_READ_CLAIM],
                description: 'Aşı stok girişleri: seri no, son kullanma, firma ve fatura; yazdırma ve dışa aktarma.'
            },
            {
                label: 'İlaç Kayıt Defteri',
                icon: 'pi pi-fw pi-book',
                route: `${REPORTS_ROUTE}/registers/medications`,
                claims: [STOCK_MOVEMENTS_READ_CLAIM],
                description: 'İlaç stok girişleri: firma, fatura ve seri no; yazdırma ve dışa aktarma.'
            },
            {
                label: 'Narkotik ve Psikotropik Defteri',
                icon: 'pi pi-fw pi-book',
                route: `${REPORTS_ROUTE}/registers/controlled-substances`,
                claims: [STOCK_MOVEMENTS_READ_CLAIM, ADMINISTRATIONS_READ_CLAIM],
                requireAllClaims: true,
                description: 'Narkotik ve psikotropik ürünlerin stok ve sarf defteri; yazdırma ve dışa aktarma.'
            },
            {
                label: 'Aşı Bilgi Raporu',
                icon: 'pi pi-fw pi-book',
                route: `${REPORTS_ROUTE}/registers/vaccine-info`,
                claims: [ADMINISTRATIONS_READ_CLAIM, VACCINATIONS_READ_CLAIM, PRODUCTS_READ_CLAIM],
                requireAllClaims: true,
                description: 'Hayvanlara uygulanan aşılar: hasta, ürün, seri no ve tutar; yazdırma ve dışa aktarma.'
            }
        ]
    }
];

/** "Yönetici düzeyi": Admin, Owner ve ClinicAdmin'in birlikte sahip olduğu düzeltme izni; Özet bu izne bağlıdır (ADR-017 K5). */
export const MANAGER_LEVEL_CLAIM = VISITS_CORRECT_CLAIM;

/** Birleşik menü öğesi: yol ilk sekmeye açılır, izin sekme izinlerinin birleşimidir, sayfa başlığı kategorisi öğenin adıdır. */
function tabbedEntry(label: string, icon: string, tabs: readonly MenuTab[], options: Pick<MenuEntry, 'badge' | 'badgeText'> = {}): MenuEntry {
    return { label, icon, route: tabs[0].route, claims: tabs.flatMap((tab) => tab.claims ?? []), tabs, category: label, ...options };
}

/** Menü, iş akışına göre 8-9 öğedir (ADR-017); eski liste rotaları sekme olarak aynen çalışır. */
export const MENU_GROUPS: readonly MenuGroup[] = [
    {
        category: 'Panel',
        entries: [
            { label: 'Bugün', icon: 'pi pi-fw pi-sun', route: '/panel/today', claims: [VISITS_READ_CLAIM], badge: 'waitingVisits' },
            { label: 'Özet', icon: 'pi pi-fw pi-th-large', route: '/panel/dashboard', claims: [MANAGER_LEVEL_CLAIM] },
            tabbedEntry('Hastalar', 'pi pi-fw pi-heart', [
                { label: 'Müşteriler', route: '/panel/clients', claims: [CLIENTS_READ_CLAIM] },
                { label: 'Hayvanlar', route: '/panel/pets', claims: [PETS_READ_CLAIM] }
            ]),
            tabbedEntry('Randevular', 'pi pi-fw pi-calendar', [
                { label: 'Liste', route: '/panel/appointments', claims: [APPOINTMENTS_READ_CLAIM] },
                { label: 'Takvim', route: '/panel/appointments/calendar', claims: [APPOINTMENTS_READ_CLAIM] }
            ]),
            tabbedEntry('Para', 'pi pi-fw pi-wallet', [
                { label: 'Ücretler', route: '/panel/charges', claims: [CHARGES_READ_CLAIM] },
                { label: 'Ödemeler', route: '/panel/payments', claims: [PAYMENTS_READ_CLAIM] },
                { label: 'Satışlar', route: '/panel/sales', claims: [SALES_READ_CLAIM] }
            ]),
            tabbedEntry('Stok', 'pi pi-fw pi-box', [
                { label: 'Ürünler', route: '/panel/products', claims: [PRODUCTS_READ_CLAIM] },
                { label: 'Stok durumu', route: '/panel/stocks', claims: [PRODUCTS_READ_CLAIM] },
                { label: 'Stok hareketleri', route: '/panel/stock-movements', claims: [STOCK_MOVEMENTS_READ_CLAIM] }
            ]),
            tabbedEntry(
                'Kayıtlar',
                'pi pi-fw pi-clipboard',
                [
                    { label: 'Muayeneler', route: '/panel/examinations', claims: [EXAMINATIONS_READ_CLAIM] },
                    { label: 'Tedaviler', route: '/panel/treatments', claims: [TREATMENTS_READ_CLAIM] },
                    { label: 'Reçeteler', route: '/panel/prescriptions', claims: [PRESCRIPTIONS_READ_CLAIM] },
                    { label: 'Aşılar', route: '/panel/vaccinations', claims: [VACCINATIONS_READ_CLAIM] },
                    { label: 'Lab sonuçları', route: '/panel/lab-results', claims: [LAB_RESULTS_READ_CLAIM], badge: 'requestedLabResults' },
                    { label: 'Yatışlar', route: '/panel/hospitalizations', claims: [HOSPITALIZATIONS_READ_CLAIM] },
                    { label: 'Uygulamalar', route: '/panel/administrations', claims: [ADMINISTRATIONS_READ_CLAIM] }
                ],
                { badge: 'requestedLabResults', badgeText: 'sonuç bekleyen lab istemi' }
            ),
            {
                label: 'Raporlar',
                category: 'Raporlar',
                icon: 'pi pi-fw pi-chart-line',
                route: REPORTS_ROUTE,
                claims: REPORT_SECTIONS.flatMap((section) => section.entries.flatMap((e) => e.claims ?? []))
            }
        ]
    },
    {
        pinned: true,
        category: 'Ayarlar',
        entries: [{ label: 'Ayarlar', icon: 'pi pi-fw pi-cog', route: SETTINGS_ROUTE }]
    }
];

export const DEFINITION_ENTRIES: readonly CardEntry[] = [
    {
        label: 'Türler',
        icon: 'pi pi-fw pi-tags',
        route: SPECIES_ROUTE,
        claims: [SPECIES_CREATE_CLAIM, SPECIES_UPDATE_CLAIM],
        description: 'Hayvan türlerini yönetin.'
    },
    {
        label: 'Irklar',
        icon: 'pi pi-fw pi-sitemap',
        route: BREEDS_ROUTE,
        claims: [BREEDS_CREATE_CLAIM, BREEDS_UPDATE_CLAIM],
        description: 'Türlere bağlı ırk kayıtlarını yönetin.'
    },
    {
        label: 'Ürün kategorileri',
        icon: 'pi pi-fw pi-folder-open',
        route: PRODUCT_CATEGORIES_ROUTE,
        claims: [PRODUCT_CATEGORIES_READ_CLAIM],
        description: 'Ürünleri gruplayan kategorileri yönetin.'
    }
];

export const SETTINGS_SECTIONS: readonly CardSection[] = [
    {
        label: 'Hesap',
        entries: [
            { label: 'Hesabım', icon: 'pi pi-fw pi-user', route: '/panel/settings/account', description: 'Profil bilgileriniz ve parolanız.' },
            {
                label: 'Abonelik',
                icon: 'pi pi-fw pi-wallet',
                route: '/panel/settings/subscription',
                claims: [SUBSCRIPTIONS_READ_CLAIM, SUBSCRIPTIONS_MANAGE_CLAIM],
                description: 'Plan, deneme süresi ve ödeme durumu.'
            }
        ]
    },
    {
        label: 'Klinik ve kurum',
        entries: [
            { label: 'Klinikler', icon: 'pi pi-fw pi-building', route: '/panel/settings/clinics', claims: [CLINICS_READ_CLAIM], description: 'Kuruma bağlı klinikler.' },
            { label: 'Organizasyon Ayarları', icon: 'pi pi-fw pi-building', route: '/panel/settings/organization', claims: [TENANT_MANAGEMENT_CLAIM], description: 'Kurum ve fatura bilgileri.' },
            { label: 'Kurum üyeleri', icon: 'pi pi-fw pi-users', route: '/panel/settings/members', claims: [TENANT_MANAGEMENT_CLAIM], description: 'Üyeler ve rolleri.' },
            { label: 'Davetler', icon: 'pi pi-fw pi-list', route: '/panel/settings/invites/list', claims: [TENANT_MANAGEMENT_CLAIM], description: 'Gönderilen davetler.' },
            { label: 'Davet oluştur', icon: 'pi pi-fw pi-user-plus', route: '/panel/settings/invites', claims: [TENANT_MANAGEMENT_CLAIM], description: 'Kuruma yeni üye davet edin.' }
        ]
    },
    {
        label: 'İletişim',
        entries: [
            { label: 'Hatırlatmalar', icon: 'pi pi-fw pi-bell', route: '/panel/settings/reminders', claims: [REMINDERS_READ_CLAIM], description: 'Hatırlatma ayarları.' },
            { label: 'Hatırlatma Geçmişi', icon: 'pi pi-fw pi-history', route: '/panel/settings/reminders/logs', claims: [REMINDERS_READ_CLAIM], description: 'Gönderilen hatırlatmaların kaydı.' }
        ]
    },
    {
        label: 'Tanımlar',
        entries: [
            {
                label: 'Tanımlar',
                icon: 'pi pi-fw pi-book',
                route: DEFINITIONS_ROUTE,
                claims: DEFINITION_ENTRIES.flatMap((e) => e.claims ?? []),
                description: 'Tür, ırk ve ürün kategorisi gibi referans kayıtları.'
            }
        ]
    }
];

/** Öğenin sahip olduğu rotalar: birleşik öğede sekmelerin, değilse kendi yolu. */
function entryRoutes(entry: MenuEntry): readonly string[] {
    return entry.tabs?.map((tab) => tab.route) ?? [entry.route];
}

/** Adresi (sorgu ve parça hariç) kapsayan en uzun menü yolunun grubu ve girişi; eşleşme yoksa `undefined`. */
function matchForUrl(groups: readonly MenuGroup[], url: string): { group: MenuGroup; entry: MenuEntry } | undefined {
    const path = url.split(/[?#]/)[0];
    let best: { group: MenuGroup; entry: MenuEntry } | undefined;
    let bestLength = -1;
    for (const group of groups) {
        for (const entry of group.entries) {
            for (const route of entryRoutes(entry)) {
                if ((path === route || path.startsWith(`${route}/`)) && route.length > bestLength) {
                    best = { group, entry };
                    bestLength = route.length;
                }
            }
        }
    }
    return best;
}

/** Adresi kapsayan menü girişi; menüde olmayan adres için `undefined`. */
export function entryForUrl(groups: readonly MenuGroup[], url: string): MenuEntry | undefined {
    return matchForUrl(groups, url)?.entry;
}

/** Adresi kapsayan en uzun menü yolunun grubu; eşleşme yoksa `undefined`. */
export function groupForUrl(groups: readonly MenuGroup[], url: string): MenuGroup | undefined {
    return matchForUrl(groups, url)?.group;
}

/** Sayfa başlığı üstündeki kategori etiketi: girişin kendi kategorisi, yoksa grubun adı; menüde olmayan adres için `undefined`. */
export function categoryForUrl(groups: readonly MenuGroup[], url: string): string | undefined {
    const match = matchForUrl(groups, url);
    return match?.entry.category ?? match?.group.label ?? match?.group.category;
}

type HasClaim = (claim: string) => boolean;

export function visibleEntries<T extends NavigationEntry>(entries: readonly T[], hasClaim: HasClaim): T[] {
    return entries.filter((e) => !e.claims?.length || (e.requireAllClaims ? e.claims.every(hasClaim) : e.claims.some(hasClaim)));
}

/** İzne göre süzer; hiç girişi kalmayan grup/bölüm düşer. */
export function visibleGroups<T extends { readonly entries: readonly NavigationEntry[] }>(groups: readonly T[], hasClaim: HasClaim): T[] {
    return groups.map((g) => ({ ...g, entries: visibleEntries(g.entries, hasClaim) })).filter((g) => g.entries.length > 0);
}

/** Menü bağlantısının gittiği yol: birleşik öğede yetkili ilk sekme (tek sekme kalırsa doğrudan o), değilse öğenin yolu. */
export function menuLinkRoute(entry: MenuEntry, hasClaim: HasClaim): string {
    return (entry.tabs && visibleEntries(entry.tabs, hasClaim)[0]?.route) || entry.route;
}

/** Giriş sonrası açılış sayfası: menüdeki ilk erişilebilir öğe (Bugün izni varsa Bugün). */
export function firstAccessibleRoute(groups: readonly MenuGroup[], hasClaim: HasClaim): string | undefined {
    const first = visibleGroups(groups, hasClaim)[0]?.entries[0];
    return first && menuLinkRoute(first, hasClaim);
}

/**
 * Adres bir birleşik öğenin liste sayfasıysa sekme çubuğu: yetkili sekmeler ve etkin sekme.
 * Detay ve form adreslerinde, ya da yalnız tek sekme yetkiliyken `undefined`.
 */
export function tabsForUrl(groups: readonly MenuGroup[], url: string, hasClaim: HasClaim): { tabs: MenuTab[]; active: MenuTab } | undefined {
    const path = url.split(/[?#]/)[0];
    const entry = groups.flatMap((g) => g.entries).find((e) => e.tabs?.some((tab) => tab.route === path));
    const tabs = entry?.tabs ? visibleEntries(entry.tabs, hasClaim) : [];
    const active = tabs.find((tab) => tab.route === path);
    return active && tabs.length > 1 ? { tabs, active } : undefined;
}
