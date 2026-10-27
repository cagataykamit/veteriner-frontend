/**
 * Backend — klinik tanımlı yatış bölümü (ward) ve oda/kafes (room) DTO'ları (`docs/HOSPITALIZATION_MODEL_API_CONTRACT.md` §10).
 */

export interface HospitalizationRoomDto {
    id: string;
    wardId?: string | null;
    name?: string | null;
    sortOrder?: number | null;
    isActive?: boolean | null;
}

/** `GET /clinics/{id}/hospitalization-wards` öğesi; `rooms` aktif/pasif hepsi, `sortOrder` sonra ad sıralı. */
export interface HospitalizationWardDto {
    id: string;
    clinicId?: string | null;
    name?: string | null;
    sortOrder?: number | null;
    isActive?: boolean | null;
    rooms?: HospitalizationRoomDto[] | null;
}

/** POST (oluştur) ve PUT (ad / sıra) gövdesi; bölüm ve oda aynı biçimdedir. */
export interface HospitalizationLocationWriteRequestDto {
    name: string;
    sortOrder: number;
}
