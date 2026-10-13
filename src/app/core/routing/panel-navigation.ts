import {
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
    SPECIES_CREATE_CLAIM,
    SPECIES_UPDATE_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM,
    SUBSCRIPTIONS_MANAGE_CLAIM,
    SUBSCRIPTIONS_READ_CLAIM,
    TENANT_MANAGEMENT_CLAIM,
    TREATMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM,
    VISITS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';

/**
 * Panel gezinti kaydı: kenar menü, Ayarlar ve Tanımlar sayfaları öğe, rota ve izin bilgisini buradan okur.
 * Yeni özellik otomatik menü öğesi olmaz; önce mevcut bir akışa girip girmeyeceği değerlendirilir (ADR-004).
 */
export interface NavigationEntry {
    readonly label: string;
    readonly route: string;
    /** İzinlerden herhangi biri yeterli; boş veya yoksa herkese açık. */
    readonly claims?: readonly string[];
}

export interface MenuEntry extends NavigationEntry {
    readonly icon: string;
    /** `true`: yalnız tam adres vurgulanır; varsayılan alt yollarda da vurgulanır. */
    readonly exact?: boolean;
}

export interface MenuGroup {
    /** Yoksa grup başlıksızdır: öğeleri her zaman görünür, açılıp kapanmaz. */
    readonly label?: string;
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
                label: 'Ödeme Raporu',
                icon: 'pi pi-fw pi-file-export',
                route: `${REPORTS_ROUTE}/payments`,
                claims: [PAYMENTS_READ_CLAIM],
                description: 'Tahsilatlar ve ödeme yöntemine göre toplam.'
            }
        ]
    }
];

export const MENU_GROUPS: readonly MenuGroup[] = [
    {
        entries: [
            { label: 'Bugün', icon: 'pi pi-fw pi-calendar-clock', route: '/panel/today', claims: [VISITS_READ_CLAIM] },
            { label: 'Özet', icon: 'pi pi-fw pi-home', route: '/panel/dashboard' }
        ]
    },
    {
        label: 'Klinik',
        defaultOpen: true,
        entries: [
            // Takvim ayrı öğe olduğu sürece Randevular yalnız liste adresinde vurgulanır.
            { label: 'Randevular', icon: 'pi pi-fw pi-calendar', route: '/panel/appointments', claims: [APPOINTMENTS_READ_CLAIM], exact: true },
            { label: 'Randevu Takvimi', icon: 'pi pi-fw pi-calendar-clock', route: '/panel/appointments/calendar', claims: [APPOINTMENTS_READ_CLAIM] },
            { label: 'Müşteriler', icon: 'pi pi-fw pi-users', route: '/panel/clients', claims: [CLIENTS_READ_CLAIM] },
            { label: 'Hayvanlar', icon: 'pi pi-fw pi-heart', route: '/panel/pets', claims: [PETS_READ_CLAIM] },
            { label: 'Muayeneler', icon: 'pi pi-fw pi-file-edit', route: '/panel/examinations', claims: [EXAMINATIONS_READ_CLAIM] },
            { label: 'Yatışlar', icon: 'pi pi-fw pi-building', route: '/panel/hospitalizations', claims: [HOSPITALIZATIONS_READ_CLAIM] },
            { label: 'Aşılar', icon: 'pi pi-fw pi-shield', route: '/panel/vaccinations', claims: [VACCINATIONS_READ_CLAIM] },
            { label: 'Lab sonuçları', icon: 'pi pi-fw pi-chart-bar', route: '/panel/lab-results', claims: [LAB_RESULTS_READ_CLAIM] },
            { label: 'Tedaviler', icon: 'pi pi-fw pi-briefcase', route: '/panel/treatments', claims: [TREATMENTS_READ_CLAIM] },
            { label: 'Reçeteler', icon: 'pi pi-fw pi-file', route: '/panel/prescriptions', claims: [PRESCRIPTIONS_READ_CLAIM] }
        ]
    },
    {
        label: 'Para',
        defaultOpen: true,
        entries: [
            { label: 'Ücretler', icon: 'pi pi-fw pi-receipt', route: '/panel/charges', claims: [CHARGES_READ_CLAIM] },
            { label: 'Ödemeler', icon: 'pi pi-fw pi-credit-card', route: '/panel/payments', claims: [PAYMENTS_READ_CLAIM] },
            {
                label: 'Raporlar',
                icon: 'pi pi-fw pi-chart-line',
                route: REPORTS_ROUTE,
                claims: REPORT_SECTIONS.flatMap((section) => section.entries.flatMap((e) => e.claims ?? []))
            }
        ]
    },
    {
        label: 'Stok',
        entries: [
            { label: 'Ürünler', icon: 'pi pi-fw pi-box', route: '/panel/products', claims: [PRODUCTS_READ_CLAIM] },
            { label: 'Stok Durumu', icon: 'pi pi-fw pi-chart-bar', route: '/panel/stocks', claims: [PRODUCTS_READ_CLAIM] },
            { label: 'Stok hareketleri', icon: 'pi pi-fw pi-arrow-right-arrow-left', route: '/panel/stock-movements', claims: [STOCK_MOVEMENTS_READ_CLAIM] }
        ]
    },
    {
        pinned: true,
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

/** Adresi (sorgu ve parça hariç) kapsayan en uzun menü yolunun grubu; eşleşme yoksa `undefined`. */
export function groupForUrl(groups: readonly MenuGroup[], url: string): MenuGroup | undefined {
    const path = url.split(/[?#]/)[0];
    let best: { group: MenuGroup; length: number } | undefined;
    for (const group of groups) {
        for (const { route } of group.entries) {
            const matches = path === route || path.startsWith(`${route}/`);
            if (matches && route.length > (best?.length ?? -1)) {
                best = { group, length: route.length };
            }
        }
    }
    return best?.group;
}

type HasClaim = (claim: string) => boolean;

export function visibleEntries<T extends NavigationEntry>(entries: readonly T[], hasClaim: HasClaim): T[] {
    return entries.filter((e) => !e.claims?.length || e.claims.some(hasClaim));
}

/** İzne göre süzer; hiç girişi kalmayan grup/bölüm düşer. */
export function visibleGroups<T extends { readonly entries: readonly NavigationEntry[] }>(groups: readonly T[], hasClaim: HasClaim): T[] {
    return groups.map((g) => ({ ...g, entries: visibleEntries(g.entries, hasClaim) })).filter((g) => g.entries.length > 0);
}
