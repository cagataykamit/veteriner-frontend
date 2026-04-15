import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

type StatusEnum012 = 0 | 1 | 2;

export interface AppointmentWriteStatusOption {
    readonly label: string;
    readonly value: StatusEnum012;
}

const ENUM_LABEL: Record<StatusEnum012, string> = {
    0: 'Planlandı',
    1: 'Tamamlandı',
    2: 'İptal'
};

const ENUM_SEVERITY: Record<StatusEnum012, StatusTagSeverity> = {
    0: 'info',
    1: 'success',
    2: 'danger'
};

/** Create/edit `p-select` — `optionValue` = 0 | 1 | 2 */
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
        return i === 0 || i === 1 || i === 2 ? i : null;
    }
    const s = String(raw).trim();
    if (!s) {
        return null;
    }
    if (/^-?\d+$/.test(s)) {
        const i = Number.parseInt(s, 10);
        return i === 0 || i === 1 || i === 2 ? i : null;
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
    return null;
}

export function appointmentStatusEnumLabel(status: number | null | undefined): string {
    if (status === null || status === undefined) {
        return EM;
    }
    if (status === 0 || status === 1 || status === 2) {
        return ENUM_LABEL[status];
    }
    return `Durum (${status})`;
}

export function appointmentStatusEnumSeverity(status: number | null | undefined): StatusTagSeverity {
    if (status === 0 || status === 1 || status === 2) {
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
