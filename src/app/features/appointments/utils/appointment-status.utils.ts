import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

type StatusEnum0123 = 0 | 1 | 2 | 3;

export interface AppointmentWriteStatusOption {
    readonly label: string;
    readonly value: StatusEnum0123;
}

const ENUM_LABEL: Record<StatusEnum0123, string> = {
    0: 'Planlandı',
    1: 'Tamamlandı',
    2: 'İptal',
    3: 'Gelmedi'
};

const ENUM_SEVERITY: Record<StatusEnum0123, StatusTagSeverity> = {
    0: 'info',
    1: 'success',
    2: 'danger',
    3: 'warn'
};

/** Düzenleme `p-select` — `optionValue` = 0 | 1 | 2. Gelmedi (3) formdan seçilmez; kendi ucuyla işaretlenir. */
export const APPOINTMENT_WRITE_STATUS_OPTIONS: ReadonlyArray<AppointmentWriteStatusOption> = [
    { label: 'Planlandı', value: 0 },
    { label: 'Tamamlandı', value: 1 },
    { label: 'İptal', value: 2 }
];

/**
 * API ham değerini resmi enum’a çevirir; tanınmazsa `null` (sessiz Planlandı yok).
 */
export function parseAppointmentStatusRawToEnum(raw: unknown): number | null {
    if (raw === null || raw === undefined) {
        return null;
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const i = Math.trunc(raw);

        return i >= 0 && i <= 3 ? i : null;
    }

    const s = String(raw).trim();

    if (!s) {
        return null;
    }

    if (/^-?\d+$/.test(s)) {
        const i = Number.parseInt(s, 10);

        return i >= 0 && i <= 3 ? i : null;
    }

    const k = s.toLocaleLowerCase('tr-TR');

    if (k === 'scheduled' || k === 'planned' || k === 'planlandi' || k === 'planlandı') {
        return 0;
    }

    if (k === 'completed' || k === 'done' || k === 'tamamlandi' || k === 'tamamlandı') {
        return 1;
    }

    if (k === 'cancelled' || k === 'canceled' || k === 'iptal' || k === 'cancel') {
        return 2;
    }

    if (k === 'noshow' || k === 'no-show' || k === 'no_show' || k === 'gelmedi') {
        return 3;
    }

    return null;
}

export function appointmentStatusEnumLabel(status: number | null | undefined): string {
    if (status === null || status === undefined) {
        return EM;
    }

    if (status === 0 || status === 1 || status === 2 || status === 3) {
        return ENUM_LABEL[status];
    }

    return `Durum (${status})`;
}

export function appointmentStatusEnumSeverity(status: number | null | undefined): StatusTagSeverity {
    if (status === 0 || status === 1 || status === 2 || status === 3) {
        return ENUM_SEVERITY[status];
    }

    return 'secondary';
}

/**
 * Liste/detay — VM `number | null` veya nadir eski string yanıtı.
 */
export function appointmentStatusLabel(status: number | string | null | undefined): string {
    if (status === null || status === undefined) {
        return EM;
    }

    if (typeof status === 'number') {
        return appointmentStatusEnumLabel(status);
    }

    const n = parseAppointmentStatusRawToEnum(status);

    if (n !== null) {
        return appointmentStatusEnumLabel(n);
    }

    const t = status.trim();

    return t || EM;
}

export function appointmentStatusSeverity(status: number | string | null | undefined): StatusTagSeverity {
    if (status === null || status === undefined) {
        return 'secondary';
    }

    if (typeof status === 'number') {
        return appointmentStatusEnumSeverity(status);
    }

    const n = parseAppointmentStatusRawToEnum(status);

    if (n !== null) {
        return appointmentStatusEnumSeverity(n);
    }

    return 'secondary';
}

/** Ürün kuralı: Cancelled (2) randevudan muayene create başlatılamaz. */
export function isAppointmentCancelledStatus(status: number | string | null | undefined): boolean {
    if (status === null || status === undefined) {
        return false;
    }

    if (typeof status === 'number') {
        return status === 2;
    }

    const n = parseAppointmentStatusRawToEnum(status);

    return n === 2;
}

/** Ürün kuralı: NoShow (3) randevuya doğrudan muayene açılamaz; önce geliş açılır veya gelmedi geri alınır. */
export function isAppointmentNoShowStatus(status: number | string | null | undefined): boolean {
    return status !== null && status !== undefined && parseAppointmentStatusRawToEnum(status) === 3;
}

/** "Gelmedi işaretle": yalnızca saati geçmiş `Scheduled` randevu (sunucu da `NoShowNotYetDue` ile denetler). */
export function canMarkAppointmentNoShow(status: number | string | null | undefined, scheduledAtUtc: string | null | undefined, now: Date): boolean {
    if (parseAppointmentStatusRawToEnum(status) !== 0 || !scheduledAtUtc) {
        return false;
    }

    const at = new Date(scheduledAtUtc).getTime();

    return !Number.isNaN(at) && at <= now.getTime();
}

/** "İptal et": yalnızca `Scheduled` randevu (sunucu `Appointment.Cancel` ile aynı; iptalden geri dönüş ucu yoktur). */
export function canCancelAppointment(status: number | string | null | undefined): boolean {
    return parseAppointmentStatusRawToEnum(status) === 0;
}

export function canRevertAppointmentNoShow(status: number | string | null | undefined): boolean {
    return isAppointmentNoShowStatus(status);
}
