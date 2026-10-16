import type { ParamMap } from '@angular/router';
import { addGregorianDaysToYmd, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/**
 * Aşı listesine giden derin bağlantının süzgeçleri (`/panel/vaccinations?status=0&fromDate=…&onlyReceivingCare=true`).
 * Bağlantıyı veren kart, gösterdiği kaydın/sayının tanımıyla aynı süzgeci geçirir; liste sayfası okuyup süzgeç çubuğuna uygular.
 * Değerler liste süzgeciyle aynıdır: `status` API enum'u (0 Planlandı, 1 Uygulandı, 2 İptal), tarihler İstanbul günü `yyyy-MM-dd`
 * (iki uç dahil; planlı kayıtta `dueAtUtc` üzerinden), `onlyReceivingCare` vefat eden hastaların aşılarını dışlar.
 */
export interface VaccinationsListLinkFilters {
    status: string;
    fromDate: string;
    toDate: string;
    onlyReceivingCare: boolean;
}

export const VACCINATION_LIST_STATUS_SCHEDULED = '0';

/** Liste süzgeci uygulandıktan sonra adres çubuğundan kaldırılır (durum oturum belleğinde kalır). */
export const CLEAR_VACCINATIONS_LIST_LINK_QUERY = { status: null, fromDate: null, toDate: null, onlyReceivingCare: null } as const;

const STATUS_VALUES = new Set(['0', '1', '2']);
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Yaklaşan aşı tanımı: planlı, vadesi bugünün (İstanbul) başından itibaren, bakım alan (vefat etmemiş) hastalar.
 * Pano "Yaklaşan aşılar" kartının API sorgusu ve "Tümü →" bağlantısı bu tek tanımı kullanır.
 */
export function upcomingVaccinationsFilters(now: Date = new Date()): VaccinationsListLinkFilters {
    return {
        status: VACCINATION_LIST_STATUS_SCHEDULED,
        fromDate: toIstanbulDateInputValue(now.toISOString()),
        toDate: '',
        onlyReceivingCare: true
    };
}

/** Pano uyarısının gün sayısı (bugün dahil); backend `VaccinationDueRule.DashboardUpcomingDays` ile aynı. */
export const DASHBOARD_UPCOMING_VACCINATION_DAYS = 7;

/**
 * Pano "Yaklaşan aşılar" uyarısı (backend `upcomingVaccinationsNext7DaysCount`, ADR-028: planlı, vade bugün dahil 7 İstanbul takvim günü
 * içinde, vefat edenler hariç). Liste aralığı aynı günlerdir: başlangıç bugün, bitiş bugün + 6 gün (iki uç dahil); sayı ile liste birebir uyuşur.
 */
export function upcomingVaccinationsNext7DaysFilters(now: Date = new Date()): VaccinationsListLinkFilters {
    const filters = upcomingVaccinationsFilters(now);

    return { ...filters, toDate: addGregorianDaysToYmd(filters.fromDate, DASHBOARD_UPCOMING_VACCINATION_DAYS - 1) ?? '' };
}

/** Süzgeçleri yönlendirme sorgusuna çevirir; boş alanlar adrese yazılmaz. */
export function vaccinationsListLinkQuery(filters: VaccinationsListLinkFilters): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.status) {
        query['status'] = filters.status;
    }

    if (filters.fromDate) {
        query['fromDate'] = filters.fromDate;
    }

    if (filters.toDate) {
        query['toDate'] = filters.toDate;
    }

    if (filters.onlyReceivingCare) {
        query['onlyReceivingCare'] = 'true';
    }

    return query;
}

/** Geçerli süzgeç parametresi yoksa `null`; geçersiz değerler yok sayılır. */
export function readVaccinationsListLinkFilters(params: ParamMap): VaccinationsListLinkFilters | null {
    const status = params.get('status')?.trim() ?? '';
    const fromDate = params.get('fromDate')?.trim() ?? '';
    const toDate = params.get('toDate')?.trim() ?? '';
    const filters: VaccinationsListLinkFilters = {
        status: STATUS_VALUES.has(status) ? status : '',
        fromDate: DATE_ONLY.test(fromDate) ? fromDate : '',
        toDate: DATE_ONLY.test(toDate) ? toDate : '',
        onlyReceivingCare: params.get('onlyReceivingCare')?.trim().toLowerCase() === 'true'
    };

    return filters.status || filters.fromDate || filters.toDate || filters.onlyReceivingCare ? filters : null;
}
