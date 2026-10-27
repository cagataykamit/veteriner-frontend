/**
 * HBS yardımcısı (ADR-036 Dilim 2) — backend `docs/HBS_ASSISTANT_API_CONTRACT.md`.
 * Vetinity HBS'e bağlanmaz; hekim HBS'e e-Devlet ile kendisi girer, dönen numarayı burada geri kaydeder.
 */

export type HbsEntryStatus = 'NotEntered' | 'Entered' | 'NotRequired';

/** Reçete (e-Reçete) veya aşı (ATS) kaydı. */
export type HbsRecordKind = 'prescription' | 'vaccination';

export interface HbsEntryDto {
    status: HbsEntryStatus;
    referenceNumber?: string | null;
    notRequiredReason?: string | null;
    markedAtUtc?: string | null;
    markedByUserId?: string | null;
    markedByName?: string | null;
    /** Kayıt HBS takibi kapsamında mı (takip dışı aşıda rozet gösterilmez). */
    isTracked?: boolean | null;
}

export interface HbsDataFieldDto {
    key: string;
    label: string;
    /** HBS'e kopyalanacak metin; boşsa `null` (satır yine gösterilir). */
    value?: string | null;
}

export interface HbsDataSectionDto {
    key: string;
    title: string;
    fields: HbsDataFieldDto[];
}

export interface HbsDataDto {
    recordKind: 'Prescription' | 'Vaccination';
    recordId: string;
    hbs: HbsEntryDto;
    /** Sahip kimlik no maskeli döndü (tam değer yalnız müşteri düzenleme izniyle). */
    ownerIdentityMasked: boolean;
    sections: HbsDataSectionDto[];
    copyAllText: string;
}

export interface UpdateHbsEntryRequest {
    status: HbsEntryStatus;
    referenceNumber?: string | null;
    notRequiredReason?: string | null;
}

export interface HbsEntryVm {
    status: HbsEntryStatus;
    referenceNumber: string | null;
    notRequiredReason: string | null;
    markedAtUtc: string | null;
    markedByName: string | null;
    isTracked: boolean;
}
