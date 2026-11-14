import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

export type VaccinationStatusEnum = 0 | 1 | 2;

const LABELS: Record<VaccinationStatusEnum, string> = {
    '0': 'Planlandı',
    '1': 'Uygulandı',
    '2': 'İptal'
};

export function parseVaccinationStatusRawToEnum(raw: unknown): VaccinationStatusEnum | null {
    if (raw === null || raw === undefined) {
        return null;
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const i = Math.trunc(raw) as VaccinationStatusEnum;

        return i === 0 || i === 1 || i === 2 ? i : null;
    }

    const s = String(raw).trim();

    if (!s) {
        return null;
    }

    if (/^-?\d+$/.test(s)) {
        const i = Number.parseInt(s, 10);

        return parseVaccinationStatusRawToEnum(i);
    }

    const k = s.toLowerCase();

    if (k === 'planned' || k === 'scheduled' || k === 'planlandi' || k === 'planlandı') {
        return 0;
    }

    if (k === 'applied' || k === 'completed' || k === 'uygulandi' || k === 'uygulandı') {
        return 1;
    }

    if (k === 'cancelled' || k === 'canceled' || k === 'iptal' || k === 'cancel') {
        return 2;
    }

    return null;
}

export function vaccinationStatusLabel(status: number | string | null | undefined): string {
    if (status == null || status === '') {
        return EM;
    }

    const parsed = parseVaccinationStatusRawToEnum(status);

    if (parsed === null) {
        return `Durum (${status})`;
    }

    return LABELS[parsed];
}

export interface VaccinationWriteStatusOption {
    readonly label: string;
    readonly value: VaccinationStatusEnum;
}

/** Formda seçilebilen durumlar: iptal ayrı, gerekçeli eylemdir (ADR-043 AK-3; `VACCINATIONS_API_CONTRACT.md` §1). */
export const VACCINATION_WRITE_STATUS_OPTIONS = [
    { label: 'Planlandı', value: 0 },
    { label: 'Uygulandı', value: 1 }
] as const satisfies ReadonlyArray<VaccinationWriteStatusOption>;

export type VaccinationWriteStatus = (typeof VACCINATION_WRITE_STATUS_OPTIONS)[number]['value'];

/** Düzenlemede seçilebilen durumlar: uygulanmış aşı planlıya dönmez (sunucu `Vaccinations.InvalidStatusTransition` ile reddeder). */
export function vaccinationEditStatusOptions(current: number | null | undefined): VaccinationWriteStatusOption[] {
    return current === 1 ? VACCINATION_WRITE_STATUS_OPTIONS.filter((o) => o.value === 1) : [...VACCINATION_WRITE_STATUS_OPTIONS];
}

export function vaccinationStatusSeverity(status: string | number | null | undefined): StatusTagSeverity {
    const parsed = parseVaccinationStatusRawToEnum(status);

    if (parsed === null) {
        return 'secondary';
    }

    if (parsed === 0) {
        return 'warn';
    }

    if (parsed === 1) {
        return 'success';
    }

    if (parsed === 2) {
        return 'danger';
    }

    return 'secondary';
}
