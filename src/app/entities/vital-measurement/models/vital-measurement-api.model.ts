/**
 * Vital ölçümü API DTO'ları — `docs/VITAL_SIGNS_API_CONTRACT.md` (HOSP-004).
 * Yalnızca mapper ve servis kullanır.
 */

interface VitalValuesDto {
    temperatureC?: number | null;
    heartRateBpm?: number | null;
    respiratoryRatePerMin?: number | null;
    weightKg?: number | null;
}

/** Eğilim noktası kaynağı (§6): vital ölçümü kaydı ya da muayenenin vital alanları. */
export type VitalSeriesSourceDto = 'VitalMeasurement' | 'Examination';

export interface VitalSeriesPointDto extends VitalValuesDto {
    source: VitalSeriesSourceDto;
    sourceId: string;
    clinicId: string;
    measuredAtUtc: string;
    hospitalizationId?: string | null;
    examinationId?: string | null;
}

/** `GET /vital-measurements/series` yanıtı; noktalar artan zaman sırasındadır. */
export interface VitalSeriesDto {
    points?: VitalSeriesPointDto[] | null;
    truncated?: boolean;
    /** Kullanıcının okuma izni olmadığı için atlanan kaynaklar (ör. `Examination`). */
    omittedSources?: string[] | null;
}

export interface VitalMeasurementListItemDto extends VitalValuesDto {
    id: string;
    clinicId: string;
    petId: string;
    hospitalizationId?: string | null;
    examinationId?: string | null;
    measuredAtUtc: string;
    note?: string | null;
    isCancelled: boolean;
    addedAfterFinalization: boolean;
}

export interface VitalMeasurementPagedResultDto {
    items?: VitalMeasurementListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface VitalMeasurementDetailDto extends VitalValuesDto {
    id: string;
    clinicId: string;
    petId: string;
    hospitalizationId?: string | null;
    examinationId?: string | null;
    measuredAtUtc: string;
    note?: string | null;
    rowVersion: string;
    cancelledAtUtc?: string | null;
    cancelReason?: string | null;
    addedAfterFinalization: boolean;
    lateEntryReason?: string | null;
}

/** POST gövdesi; hasta, klinik ve bağlar oluşturulduktan sonra değişmez. */
export interface VitalMeasurementCreateRequestDto extends VitalValuesDto {
    clinicId: string;
    petId: string;
    hospitalizationId?: string | null;
    examinationId?: string | null;
    measuredAtUtc: string;
    note?: string | null;
    lateEntryReason?: string | null;
}

/** PUT gövdesi: değerler ve not tam değiştirilir (`null` = temizle). */
export interface VitalMeasurementUpdateRequestDto {
    measuredAtUtc: string;
    temperatureC: number | null;
    heartRateBpm: number | null;
    respiratoryRatePerMin: number | null;
    weightKg: number | null;
    note: string | null;
    rowVersion: string;
}

export interface VitalMeasurementCancelRequestDto {
    reason: string;
    rowVersion: string;
}

/** PUT ve iptal yanıtı (200). */
export interface VitalMeasurementWriteResultDto {
    id: string;
    rowVersion: string;
}
