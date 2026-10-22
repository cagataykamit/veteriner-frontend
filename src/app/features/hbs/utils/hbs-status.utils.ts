import type { HbsEntryDto, HbsEntryStatus, HbsEntryVm, HbsRecordKind } from '@/app/features/hbs/models/hbs.model';

/** Sözleşme sınırları (`HBS_ASSISTANT_API_CONTRACT.md` §1). */
export const HBS_REFERENCE_NUMBER_MAX = 50;

const STATUSES: readonly HbsEntryStatus[] = ['NotEntered', 'Entered', 'NotRequired'];

/** Nötr dil: zorunluluk iddiası yok ("HBS'e girilmedi"). */
export const HBS_STATUS_LABEL: Readonly<Record<HbsEntryStatus, string>> = {
    NotEntered: "HBS'e girilmedi",
    Entered: "HBS'e girildi",
    NotRequired: 'HBS gerekmiyor'
};

/** Tablo/dosya hücresi (backend CSV'deki "HBS Durumu" ile aynı). */
export const HBS_STATUS_SHORT_LABEL: Readonly<Record<HbsEntryStatus, string>> = {
    NotEntered: 'Girilmedi',
    Entered: 'Girildi',
    NotRequired: 'Gerekmiyor'
};

export const HBS_STATUS_SEVERITY: Readonly<Record<HbsEntryStatus, 'warn' | 'success' | 'secondary'>> = {
    NotEntered: 'warn',
    Entered: 'success',
    NotRequired: 'secondary'
};

/** Reçetede e-Reçete No, aşıda ATS aşı uygulama belgesi seri no. */
export const HBS_REFERENCE_LABEL: Readonly<Record<HbsRecordKind, string>> = {
    prescription: 'e-Reçete No',
    vaccination: 'ATS belge seri no'
};

/** PrimeNG `p-select [options]` değiştirilebilir dizi bekler. */
export const HBS_STATUS_FILTER_OPTIONS: { label: string; value: HbsEntryStatus }[] =STATUSES.map((s) => ({ label: HBS_STATUS_LABEL[s], value: s }));

export function isHbsEntryStatus(value: unknown): value is HbsEntryStatus {
    return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

/** Bilinmeyen değer `null` (rozet gösterilmez). */
export function parseHbsStatus(value: unknown): HbsEntryStatus | null {
    return isHbsEntryStatus(value) ? value : null;
}

export function mapHbsEntryDtoToVm(dto: HbsEntryDto | null | undefined): HbsEntryVm | null {
    const status = parseHbsStatus(dto?.status);

    if (!dto || !status) {
        return null;
    }

    return {
        status,
        referenceNumber: dto.referenceNumber?.trim() || null,
        notRequiredReason: dto.notRequiredReason?.trim() || null,
        markedAtUtc: dto.markedAtUtc ?? null,
        markedByName: dto.markedByName?.trim() || null,
        isTracked: dto.isTracked !== false
    };
}
