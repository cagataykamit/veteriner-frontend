import { parseUtcApiInstantIsoString, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/** Bu süreden yeni gelen talep "yeni" işaretlenir (nabız noktası). */
export const NEW_APPOINTMENT_REQUEST_MINUTES = 30;

const DAY_MS = 24 * 60 * 60_000;

const SHORT_DAY = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'short', day: 'numeric', month: 'short' });

/** Anın bugüne göre Europe/Istanbul takvim günü farkı (0 bugün, 1 yarın, −1 dün); okunamazsa `null`. */
export function appointmentRequestDayOffset(valueUtc: string, now: Date): number | null {
    const day = toIstanbulDateInputValue(valueUtc);
    const today = toIstanbulDateInputValue(now.toISOString());

    if (!day || !today) {
        return null;
    }

    return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export function isNewAppointmentRequest(createdAtUtc: string, now: Date): boolean {
    const created = parseUtcApiInstantIsoString(createdAtUtc);

    return !!created && now.getTime() - created.getTime() < NEW_APPOINTMENT_REQUEST_MINUTES * 60_000;
}

/** İstenen günün kısa adı: "Bugün", "Yarın" ya da "5 Kas Per" (Europe/Istanbul). */
export function appointmentRequestDayLabel(requestedStartUtc: string, now: Date): string {
    const diff = appointmentRequestDayOffset(requestedStartUtc, now);

    if (diff === 0) {
        return 'Bugün';
    }

    if (diff === 1) {
        return 'Yarın';
    }

    const d = parseUtcApiInstantIsoString(requestedStartUtc);

    return d ? SHORT_DAY.format(d) : '—';
}

/** Talebin ne zaman geldiği: "az önce", "12 dk önce", "2 sa önce", "dün", "3 gün önce". */
export function appointmentRequestAgoLabel(createdAtUtc: string, now: Date): string {
    const created = parseUtcApiInstantIsoString(createdAtUtc);

    if (!created) {
        return '';
    }

    const minutes = Math.floor((now.getTime() - created.getTime()) / 60_000);

    if (minutes < 1) {
        return 'az önce';
    }

    if (minutes < 60) {
        return `${minutes} dk önce`;
    }

    const days = -(appointmentRequestDayOffset(createdAtUtc, now) ?? 0);

    if (days < 1) {
        return `${Math.floor(minutes / 60)} sa önce`;
    }

    return days === 1 ? 'dün' : `${days} gün önce`;
}
