/**
 * Eski programdan aktarılan salt okunur kayıtlar (Veteriner `docs/IMPORT_API_CONTRACT.md` §12.8, ADR-048 T1/T4).
 * Hiçbir defter, rapor, kasa veya bakiye bu kayıtlardan türemez.
 */

export interface ImportedClinicalRecordDto {
    id: string;
    /** Yalnız tarih (`yyyy-MM-dd`). */
    recordedOn: string;
    recordType: string | null;
    complaint: string | null;
    history: string | null;
    findings: string | null;
    diagnosis: string | null;
    treatment: string | null;
    prescription: string | null;
    labResults: string | null;
    notes: string | null;
    veterinarianName: string | null;
    weightKg: number | null;
    temperatureC: number | null;
    clinicId: string;
    importBatchId: string;
    createdAtUtc: string;
}

export type ImportedAccountEntryKind = 'Debit' | 'Credit';

export interface ImportedAccountEntryDto {
    id: string;
    /** Yalnız tarih (`yyyy-MM-dd`). */
    occurredOn: string;
    kind: ImportedAccountEntryKind;
    amount: number;
    currency: string;
    description: string | null;
    paymentMethod: string | null;
    documentNumber: string | null;
    petName: string | null;
    clinicId: string;
    importBatchId: string;
}

export interface ImportedPageDto<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** Hesap hareketleri zarfı: `totals` yalnız bilgidir, bakiye değildir. */
export interface ImportedAccountEntryPageDto extends ImportedPageDto<ImportedAccountEntryDto> {
    totals: { debit: number; credit: number };
}
