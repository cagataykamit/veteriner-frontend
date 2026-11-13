import {
    APPOINTMENTS_CREATE_CLAIM,
    CHARGES_CREATE_CLAIM,
    CLIENTS_CREATE_CLAIM,
    CLINICAL_SNIPPETS_CREATE_CLAIM,
    CLINICS_UPDATE_CLAIM,
    EXAMINATIONS_CREATE_CLAIM,
    EXAMINATIONS_FINALIZE_CLAIM,
    IMPORTS_READ_CLAIM,
    PAYMENTS_CREATE_CLAIM,
    PAYMENTS_READ_CLAIM,
    PRESCRIPTIONS_CREATE_CLAIM,
    PRODUCTS_CREATE_CLAIM,
    REMINDERS_READ_CLAIM,
    TENANT_MANAGEMENT_CLAIM,
    VACCINATIONS_CREATE_CLAIM,
    VISITS_CREATE_CLAIM,
    VISITS_READ_CLAIM,
    VISITS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { CLINICAL_SNIPPETS_ROUTE, IMPORTS_ROUTE, MANAGER_LEVEL_CLAIM, REPORTS_ROUTE, TODAY_ROUTE, visibleEntries, type NavigationEntry } from '@/app/core/routing/panel-navigation';

/** Rehberin rolü: ön büro (Sekreter), hekim (Veteriner), yönetici (Admin, Owner, ClinicAdmin). */
export type FirstWeekGuideRole = 'frontDesk' | 'veterinarian' | 'manager';

/** Adımı kendiliğinden "yapıldı" sayan başarılı istek: yol `/api/v1/...` kısmıyla (sorgu hariç) eşleşir. */
interface DoneRequest {
    readonly method: 'POST' | 'PUT';
    readonly path: RegExp;
    readonly body?: (body: unknown) => boolean;
}

/** Tek cümlelik adım; `label` ve `route` ilgili ekranın bağlantısıdır, izin yoksa adım görünmez. */
export interface FirstWeekGuideStep extends NavigationEntry {
    readonly key: string;
    /** Adım hapında ve başlıkta görünen kısa ad. */
    readonly title: string;
    readonly icon: string;
    readonly text: string;
    /** Yoksa adım yalnız elle işaretlenir. */
    readonly doneWhen?: readonly DoneRequest[];
}

const END_OF_DAY_ROUTE = `${REPORTS_ROUTE}/end-of-day`;
const ID = '[^/]+';

const post = (path: string, body?: DoneRequest['body']): DoneRequest => ({ method: 'POST', path: new RegExp(`^/api/v1/${path}$`), body });
const put = (path: string): DoneRequest => ({ method: 'PUT', path: new RegExp(`^/api/v1/${path}$`) });

/** Adımlar kullanıcı kılavuzundan (`operations/KULLANICI-KILAVUZU-ROL-BAZLI.md`) türetildi; yalnız pakete bağlı olmayan ekranlara gider. */
export const FIRST_WEEK_GUIDE_STEPS: Readonly<Record<FirstWeekGuideRole, readonly FirstWeekGuideStep[]>> = {
    frontDesk: [
        {
            key: 'client',
            title: 'İlk müşteri',
            icon: 'pi pi-user-plus',
            text: 'İlk hasta sahibini kaydedin; telefon numarası zorunludur.',
            label: 'Yeni müşteri',
            route: '/panel/clients/new',
            claims: [CLIENTS_CREATE_CLAIM],
            doneWhen: [post('clients'), post('clients/quick-register')]
        },
        {
            key: 'appointment',
            title: 'İlk randevu',
            icon: 'pi pi-calendar-plus',
            text: 'Boş bir saate ilk randevuyu verin.',
            label: 'Yeni randevu',
            route: '/panel/appointments/new',
            claims: [APPOINTMENTS_CREATE_CLAIM],
            doneWhen: [post('appointments')]
        },
        {
            key: 'visit',
            title: 'Geliş kaydı',
            icon: 'pi pi-sign-in',
            text: 'Hasta gelince Planlı randevulardaki Geldi düğmesiyle ya da Randevusuz geliş ile geliş kaydı açın.',
            label: 'Bugün',
            route: TODAY_ROUTE,
            claims: [VISITS_CREATE_CLAIM],
            doneWhen: [post('visits')]
        },
        {
            key: 'charge',
            title: 'Ücret yazma',
            icon: 'pi pi-receipt',
            text: 'Yapılan iş için müşteriye ücret yazın; ücret tek başına ödeme sayılmaz.',
            label: 'Yeni ücret',
            route: '/panel/charges/new',
            claims: [CHARGES_CREATE_CLAIM],
            doneWhen: [post('charges')]
        },
        {
            key: 'payment',
            title: 'Ödeme alma',
            icon: 'pi pi-wallet',
            text: 'Ödemeyi Bugün satırındaki ⋯ → Ödeme al ile ya da Ödemeler sayfasından alıp açık ücrete bağlayın.',
            label: 'Yeni ödeme',
            route: '/panel/payments/new',
            claims: [PAYMENTS_CREATE_CLAIM],
            doneWhen: [post('payments')]
        },
        {
            key: 'reminderLogs',
            title: 'Hatırlatma geçmişi',
            icon: 'pi pi-history',
            text: 'Hasta sahiplerine giden randevu ve aşı hatırlatmalarını Hatırlatma Geçmişi’nde kontrol edin.',
            label: 'Hatırlatma Geçmişi',
            route: '/panel/settings/reminders/logs',
            claims: [REMINDERS_READ_CLAIM]
        },
        {
            key: 'endOfDay',
            title: 'Gün sonu',
            icon: 'pi pi-chart-bar',
            text: 'Gün sonunda açık kalan gelişleri ve ödenmemiş ücretleri Gün sonu raporunda kontrol edin.',
            label: 'Gün sonu',
            route: END_OF_DAY_ROUTE,
            claims: [PAYMENTS_READ_CLAIM, VISITS_READ_CLAIM],
            requireAllClaims: true
        }
    ],
    veterinarian: [
        {
            key: 'visitStart',
            title: 'Bakımı başlat',
            icon: 'pi pi-play',
            text: 'Bugün’de “Benim hastalarım” ile size atanan hastaları görün ve Başlat ile bakımı başlatın.',
            label: 'Bugün',
            route: TODAY_ROUTE,
            claims: [VISITS_UPDATE_CLAIM],
            doneWhen: [post(`visits/${ID}/start`)]
        },
        {
            key: 'examination',
            title: 'İlk muayene',
            icon: 'pi pi-file-edit',
            text: 'Bugün satırındaki Muayene aç ile ilk muayeneyi açın; hasta yeniden seçilmez.',
            label: 'Yeni muayene',
            route: '/panel/examinations/new',
            claims: [EXAMINATIONS_CREATE_CLAIM],
            doneWhen: [post('examinations')]
        },
        {
            key: 'snippet',
            title: 'Metin parçası',
            icon: 'pi pi-hashtag',
            text: 'Muayene metninde # yazıp hazır metin parçası ekleyin; sık yazdığınız cümleyi kendi parçanız yapın.',
            label: 'Metin parçaları',
            route: CLINICAL_SNIPPETS_ROUTE,
            claims: [CLINICAL_SNIPPETS_CREATE_CLAIM],
            doneWhen: [post('clinical-snippets')]
        },
        {
            key: 'finalize',
            title: 'Kesinleştirme',
            icon: 'pi pi-check-square',
            text: 'Muayeneyi Kesinleştir ile kapatın; sonradan yalnız gerekçeli ek not eklenir.',
            label: 'Muayeneler',
            route: '/panel/examinations',
            claims: [EXAMINATIONS_FINALIZE_CLAIM],
            doneWhen: [post(`examinations/${ID}/finalize`)]
        },
        {
            key: 'vaccination',
            title: 'Aşı kaydı',
            icon: 'pi pi-shield',
            text: 'Uygulanan aşıyı muayene ayrıntısındaki Aşı Oluştur ile kaydedin.',
            label: 'Yeni aşı',
            route: '/panel/vaccinations/new',
            claims: [VACCINATIONS_CREATE_CLAIM],
            doneWhen: [post('vaccinations')]
        },
        {
            key: 'prescription',
            title: 'Reçete',
            icon: 'pi pi-file',
            text: 'Reçeteyi yazın; reçete stoktan düşmez, klinikte uygulanan ürün Uygulama olarak girilir.',
            label: 'Yeni reçete',
            route: '/panel/prescriptions/new',
            claims: [PRESCRIPTIONS_CREATE_CLAIM],
            doneWhen: [post('prescriptions')]
        },
        {
            key: 'visitComplete',
            title: 'Gelişi tamamla',
            icon: 'pi pi-flag',
            text: 'Gün sonunda Devam ediyor’daki gelişleri Tamamla ile kapatın, taslakta kalan muayeneleri kesinleştirin.',
            label: 'Bugün',
            route: TODAY_ROUTE,
            claims: [VISITS_UPDATE_CLAIM],
            doneWhen: [post(`visits/${ID}/complete`)]
        }
    ],
    manager: [
        {
            key: 'invite',
            title: 'Personel daveti',
            icon: 'pi pi-user-plus',
            text: 'Personeli davet edip rolünü seçin: ön büro için Sekreter, hekim için Veteriner.',
            label: 'Davet oluştur',
            route: '/panel/settings/invites',
            claims: [TENANT_MANAGEMENT_CLAIM],
            doneWhen: [post(`tenants/${ID}/invites`)]
        },
        {
            key: 'workingHours',
            title: 'Çalışma saatleri',
            icon: 'pi pi-clock',
            text: 'Kliniğin ayrıntısından çalışma saatlerini girin; randevu formundaki saat seçenekleri buradan gelir.',
            label: 'Klinikler',
            route: '/panel/settings/clinics',
            claims: [CLINICS_UPDATE_CLAIM],
            doneWhen: [put(`clinics/${ID}/working-hours`)]
        },
        {
            key: 'services',
            title: 'Hizmet fiyatları',
            icon: 'pi pi-tag',
            text: 'Muayene, aşı ve işlem ücretlerinizi türü Hizmet olan ürün olarak fiyatıyla girin.',
            label: 'Yeni ürün',
            route: '/panel/products/new',
            claims: [PRODUCTS_CREATE_CLAIM],
            doneWhen: [post('products', (body) => (body as { kind?: unknown } | null)?.kind === 'Service')]
        },
        {
            key: 'import',
            title: 'Eski kayıtlar',
            icon: 'pi pi-upload',
            text: 'Eski sistemdeki müşteri, hasta ve aşı kayıtlarını Excel ya da CSV ile içe aktarın.',
            label: 'Veri içe aktarma',
            route: IMPORTS_ROUTE,
            claims: [IMPORTS_READ_CLAIM],
            doneWhen: [post(`imports/batches/${ID}/commit`)]
        },
        {
            key: 'reminderSettings',
            title: 'Hatırlatma ayarı',
            icon: 'pi pi-bell',
            text: 'Randevu ve aşı hatırlatmalarının ne zaman gideceğini hatırlatma ayarlarında kontrol edin.',
            label: 'Hatırlatmalar',
            route: '/panel/settings/reminders',
            claims: [REMINDERS_READ_CLAIM],
            doneWhen: [put('reminders/settings')]
        },
        {
            key: 'visit',
            title: 'Geliş kaydı',
            icon: 'pi pi-sign-in',
            text: 'Bugün ekranında bir geliş kaydı açarak ön büronun günlük akışını bir kez deneyin.',
            label: 'Bugün',
            route: TODAY_ROUTE,
            claims: [VISITS_CREATE_CLAIM],
            doneWhen: [post('visits')]
        },
        {
            key: 'endOfDay',
            title: 'Gün sonu',
            icon: 'pi pi-chart-bar',
            text: 'Günün ücret, tahsilat ve açık işlerini Gün sonu raporunda kontrol edin.',
            label: 'Gün sonu',
            route: END_OF_DAY_ROUTE,
            claims: [PAYMENTS_READ_CLAIM, VISITS_READ_CLAIM],
            requireAllClaims: true
        }
    ]
};

export const FIRST_WEEK_GUIDE_ROLE_TITLES: Readonly<Record<FirstWeekGuideRole, string>> = {
    frontDesk: 'Ön büro',
    veterinarian: 'Hekim',
    manager: 'Yönetici'
};

type HasClaim = (claim: string) => boolean;

/**
 * Rol izinlerden çıkar (rol adı panelde yoktur): yönetici düzeyi izni varsa yönetici, muayene kesinleştirebiliyorsa hekim,
 * Bugün'ü okuyorsa ön büro. Bugün'ü göremeyen kullanıcıda rehber yoktur (`null`).
 */
export function firstWeekGuideRole(hasClaim: HasClaim): FirstWeekGuideRole | null {
    if (!hasClaim(VISITS_READ_CLAIM)) {
        return null;
    }

    if (hasClaim(MANAGER_LEVEL_CLAIM)) {
        return 'manager';
    }

    return hasClaim(EXAMINATIONS_FINALIZE_CLAIM) ? 'veterinarian' : 'frontDesk';
}

/** Rolün adımlarından kullanıcının ekranına erişebildikleri. */
export function firstWeekGuideSteps(role: FirstWeekGuideRole, hasClaim: HasClaim): FirstWeekGuideStep[] {
    return visibleEntries(FIRST_WEEK_GUIDE_STEPS[role], hasClaim);
}

/** Başarılı yanıtı gelince "yapıldı" sayılacak adım anahtarları (tüm rollerde; anahtar rol fark etmeksizin aynı işi anlatır). */
export function firstWeekGuideKeysForRequest(method: string, url: string, body: unknown): string[] {
    const start = url.indexOf('/api/v1/');

    if (start < 0 || (method !== 'POST' && method !== 'PUT')) {
        return [];
    }

    const path = url.slice(start).split(/[?#]/)[0];
    const keys = new Set<string>();

    for (const step of Object.values(FIRST_WEEK_GUIDE_STEPS).flat()) {
        if (step.doneWhen?.some((r) => r.method === method && r.path.test(path) && (!r.body || r.body(body)))) {
            keys.add(step.key);
        }
    }

    return [...keys];
}
