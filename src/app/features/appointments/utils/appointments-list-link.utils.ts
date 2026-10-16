import type { ParamMap } from '@angular/router';
import { toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/**
 * Randevu listesine giden derin bağlantının süzgeçleri (`/panel/appointments?status=0&fromDate=…`).
 * Bağlantıyı veren kart, gösterdiği kaydın/sayının tanımıyla aynı süzgeci geçirir; liste sayfası okuyup süzgeç çubuğuna uygular.
 * Değerler liste süzgeciyle aynıdır: `status` API enum'u (0 Planlandı … 3 Gelmedi), tarihler İstanbul günü `yyyy-MM-dd` (iki uç dahil).
 */
export interface AppointmentsListLinkFilters {
    status: string;
    fromDate: string;
    toDate: string;
}

export const APPOINTMENT_LIST_STATUS_SCHEDULED = '0';

/** Liste süzgeci uygulandıktan sonra adres çubuğundan kaldırılır (durum oturum belleğinde kalır). */
export const CLEAR_APPOINTMENTS_LIST_LINK_QUERY = { status: null, fromDate: null, toDate: null } as const;

const STATUS_VALUES = new Set(['0', '1', '2', '3']);
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Bugünden (İstanbul) itibaren planlı randevular: hasta açık işlerindeki "sonraki randevu" tanımı (`status = Scheduled`, ileri tarih). */
export function upcomingScheduledAppointmentsLinkQuery(now: Date = new Date()): { status: string; fromDate: string } {
    return { status: APPOINTMENT_LIST_STATUS_SCHEDULED, fromDate: toIstanbulDateInputValue(now.toISOString()) };
}

/** Yalnız tek bir İstanbul günü (ör. Pano "Bugünkü randevular"). */
export function singleDayAppointmentsLinkQuery(dateYmd: string): { fromDate: string; toDate: string } {
    return { fromDate: dateYmd, toDate: dateYmd };
}

/** Geçerli süzgeç parametresi yoksa `null`; geçersiz değerler yok sayılır. */
export function readAppointmentsListLinkFilters(params: ParamMap): AppointmentsListLinkFilters | null {
    const status = params.get('status')?.trim() ?? '';
    const fromDate = params.get('fromDate')?.trim() ?? '';
    const toDate = params.get('toDate')?.trim() ?? '';
    const filters: AppointmentsListLinkFilters = {
        status: STATUS_VALUES.has(status) ? status : '',
        fromDate: DATE_ONLY.test(fromDate) ? fromDate : '',
        toDate: DATE_ONLY.test(toDate) ? toDate : ''
    };

    return filters.status || filters.fromDate || filters.toDate ? filters : null;
}
