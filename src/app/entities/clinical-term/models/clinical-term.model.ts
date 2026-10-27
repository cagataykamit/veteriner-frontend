/** Sözlük türü; kayıttan sonra değişmez (`DIAGNOSIS_DICTIONARY_API_CONTRACT.md`). */
export type ClinicalTermKind = 'Diagnosis' | 'Complaint';

export const CLINICAL_TERM_KIND_LABELS: Record<ClinicalTermKind, string> = {
    Diagnosis: 'Tanı',
    Complaint: 'Şikâyet'
};

/** Ad sınırı (sunucu kırpar, art arda boşluğu teke indirir; 1–200 karakter). */
export const CLINICAL_TERM_NAME_MAX = 200;

/** `GET /api/v1/clinical-terms` öğesi; `isSystem` kaydı salt okunurdur. */
export interface ClinicalTermDto {
    id: string;
    kind: ClinicalTermKind;
    name: string;
    isActive: boolean;
    isSystem: boolean;
    rowVersion: string;
}

export interface ClinicalTermPagedResultDto {
    items: ClinicalTermDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ClinicalTermsListQuery {
    kind?: ClinicalTermKind;
    search?: string;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
}
