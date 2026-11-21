export type VitalSignKey = 'temperatureC' | 'heartRateBpm' | 'respiratoryRatePerMin' | 'weightKg';

export interface VitalSignDefinition {
    readonly key: VitalSignKey;
    readonly label: string;
    readonly unit: string;
    readonly min: number;
    readonly max: number;
    /** Sunucu bu basamağa yuvarlar; `0` tam sayı alanıdır. */
    readonly decimals: number;
}

/**
 * Ölçüler, birimler ve aralıklar (sözleşme §1; backend `VitalSignLimits`). Panelde tek yer burasıdır;
 * sıra giriş kutularının, grafiklerin ve tablonun sırasıdır.
 */
export const VITAL_SIGNS: ReadonlyArray<VitalSignDefinition> = [
    { key: 'temperatureC', label: 'Ateş', unit: '°C', min: 25, max: 45, decimals: 1 },
    { key: 'heartRateBpm', label: 'Nabız', unit: 'atım/dk', min: 1, max: 400, decimals: 0 },
    { key: 'respiratoryRatePerMin', label: 'Solunum', unit: 'soluk/dk', min: 1, max: 200, decimals: 0 },
    { key: 'weightKg', label: 'Kilo', unit: 'kg', min: 0.01, max: 9999.99, decimals: 2 }
];

export type VitalValues = Record<VitalSignKey, number | null>;

export type VitalPointSource = 'VitalMeasurement' | 'Examination';

/** Eğilimdeki bir nokta: vital ölçümü kaydı ya da muayenenin vital alanları. */
export interface VitalPointVm extends VitalValues {
    /** Kaynak + kimlik (`track` ve seçim anahtarı). */
    key: string;
    source: VitalPointSource;
    sourceId: string;
    measuredAtUtc: string;
    /** `measuredAtUtc` epoch milisaniye (grafik ekseni). */
    time: number;
    hospitalizationId: string | null;
    examinationId: string | null;
    cancelled: boolean;
}

export interface VitalSeriesVm {
    /** Artan zaman sırası. */
    points: VitalPointVm[];
    /** Sunucu sınırı aşıldı: yalnız en yeni noktalar geldi. */
    truncated: boolean;
    /** Muayene okuma izni olmadığı için muayene vitalleri atlandı. */
    examinationsOmitted: boolean;
}

export interface VitalMeasurementDetailVm extends VitalValues {
    id: string;
    measuredAtUtc: string;
    note: string | null;
    /** PUT ve iptale aynen geri gönderilir. */
    rowVersion: string;
    hospitalizationId: string | null;
    examinationId: string | null;
    cancelledAtUtc: string | null;
    cancelReason: string | null;
    addedAfterFinalization: boolean;
    lateEntryReason: string | null;
}

export interface VitalSeriesQuery {
    petId: string;
    /** Verilirse pencere yatış süresi olur ve hastanın o süredeki tüm ölçümleri gelir. */
    hospitalizationId?: string | null;
    fromUtc?: string | null;
}

export interface VitalCancelledQuery {
    petId: string;
    dateFromUtc?: string | null;
}

/** Düzenlenebilir alanlar (PUT gövdesi; POST'un ortak kısmı). */
export interface VitalMeasurementWrite extends VitalValues {
    measuredAtUtc: string;
    note: string | null;
}

export interface CreateVitalMeasurementRequest extends VitalMeasurementWrite {
    petId: string;
    /** Yatış ve muayeneden en çok biri; ikisi de boşsa serbest ölçümdür. */
    hospitalizationId: string | null;
    examinationId: string | null;
    /** Bağlı muayene kesinleşmişse zorunlu (5–500). */
    lateEntryReason: string | null;
}
