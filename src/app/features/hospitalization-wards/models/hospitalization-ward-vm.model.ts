/**
 * Yatış bölümü / oda — UI view ve form modelleri.
 */

export interface HospitalizationRoomVm {
    id: string;
    wardId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
}

export interface HospitalizationWardVm {
    id: string;
    clinicId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    /** Sunucu sırası: `sortOrder`, sonra ad. */
    rooms: HospitalizationRoomVm[];
}

/** Ad sınırı (sunucu kırpar; 1–100 karakter, bölüm ve oda aynı). */
export const HOSPITALIZATION_LOCATION_NAME_MAX = 100;

/** Tanım penceresi form değeri; bölüm ve oda aynı alanları taşır. */
export interface HospitalizationLocationFormValue {
    name: string;
    sortOrder: number | null;
}
