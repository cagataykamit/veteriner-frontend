import { VITAL_SIGNS, type VitalSignDefinition, type VitalSignKey, type VitalValues } from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';
import { parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';

/** Sözleşme §1, D5, D7: not üst sınırı, geç kayıt penceresi, saat kayması payı, geç kayıt gerekçesi uzunluğu. */
export const VITAL_NOTE_MAX = 500;
export const VITAL_BACKDATE_DAYS = 7;
export const VITAL_FUTURE_TOLERANCE_MS = 5 * 60_000;
export const VITAL_LATE_REASON_MIN = 5;
export const VITAL_LATE_REASON_MAX = 500;

const DAY_MS = 86_400_000;

export function formatVitalValue(def: VitalSignDefinition, value: number): string {
    return value.toLocaleString('tr-TR', { minimumFractionDigits: def.key === 'temperatureC' ? 1 : 0, maximumFractionDigits: def.decimals });
}

function vitalSign(key: VitalSignKey): VitalSignDefinition {
    return VITAL_SIGNS.find((def) => def.key === key)!;
}

/** Ölçü anahtarıyla sayı gösterimi (Türkçe ondalık: "4,2"); kilo ve ateş hasta başlığında, listelerde ve muayenede aynı biçimdedir. */
export function formatVitalNumber(key: VitalSignKey, value: number): string {
    return formatVitalValue(vitalSign(key), value);
}

/** Birimli gösterim: "4,2 kg", "38,5 °C", "120 atım/dk". */
export function formatVitalReading(key: VitalSignKey, value: number): string {
    return `${formatVitalNumber(key, value)} ${vitalSign(key).unit}`;
}

/** Sunucuyla aynı yuvarlama (yarım yukarı); kayan nokta hatasına karşı üstel yazımla. */
function roundTo(value: number, decimals: number): number {
    return Number(`${Math.round(Number(`${value}e${decimals}`))}e-${decimals}`);
}

/** Boş metin `null`; ondalık virgül ve nokta kabul edilir; sayı değilse `NaN`. */
export function parseVitalInput(text: string | null | undefined): number | null {
    const trimmed = (text ?? '').trim();

    if (!trimmed) {
        return null;
    }

    return /^\d+([.,]\d+)?$/.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN;
}

/** Girilen metnin hata metni; geçerliyse ya da boşsa `null`. Aralık, sunucudaki gibi yuvarlamadan sonra denetlenir. */
export function vitalInputError(def: VitalSignDefinition, text: string | null | undefined): string | null {
    const value = parseVitalInput(text);

    if (value === null) {
        return null;
    }

    if (Number.isNaN(value)) {
        return 'Sayı girin.';
    }

    if (def.decimals === 0 && !Number.isInteger(value)) {
        return 'Tam sayı girin.';
    }

    const rounded = roundTo(value, def.decimals);

    return rounded < def.min || rounded > def.max ? `${def.label} ${formatVitalValue(def, def.min)}–${formatVitalValue(def, def.max)} ${def.unit} arasında olmalı.` : null;
}

/** Geçerli metinler için gönderilecek değerler (yuvarlanmış); geçersiz ya da boş alan `null`. */
export function vitalValuesFromInputs(inputs: Record<keyof VitalValues, string>): VitalValues {
    const values = {} as VitalValues;

    for (const def of VITAL_SIGNS) {
        const parsed = parseVitalInput(inputs[def.key]);

        values[def.key] = parsed === null || Number.isNaN(parsed) ? null : roundTo(parsed, def.decimals);
    }

    return values;
}

export function hasAnyVitalValue(values: VitalValues): boolean {
    return VITAL_SIGNS.some((def) => values[def.key] !== null);
}

/**
 * Ölçüm zamanı kuralları (D5, D6): ileri zaman yok, en çok 7 gün geriye, yatışa bağlıysa yatıştan önce olamaz.
 * `nowMs` çağıran tarafından verilir (test edilebilirlik).
 */
export function measuredAtError(measuredAtUtc: string, nowMs: number, admittedAtUtc: string | null): string | null {
    const at = parseUtcApiInstantIsoString(measuredAtUtc)?.getTime() ?? Number.NaN;

    if (Number.isNaN(at)) {
        return 'Geçerli bir ölçüm zamanı girin.';
    }

    if (at > nowMs + VITAL_FUTURE_TOLERANCE_MS) {
        return 'Ölçüm zamanı ileri bir zaman olamaz.';
    }

    if (at < nowMs - VITAL_BACKDATE_DAYS * DAY_MS) {
        return `Ölçüm zamanı en çok ${VITAL_BACKDATE_DAYS} gün geriye girilebilir.`;
    }

    // Yatış anı sunucudan `Z` olmadan gelebilir; UTC olarak çözülür.
    const admittedAt = parseUtcApiInstantIsoString(admittedAtUtc)?.getTime() ?? Number.NaN;

    return !Number.isNaN(admittedAt) && at < admittedAt ? 'Ölçüm zamanı yatıştan önce olamaz.' : null;
}

/** Zaman çizelgesindeki özetle aynı biçim (sözleşme §5): "38,6 °C · Nabız 120/dk · Solunum 24/dk · 12,45 kg". */
export function vitalSummary(values: VitalValues): string {
    const [temperature, heartRate, respiratoryRate, weight] = VITAL_SIGNS;

    return [
        values.temperatureC !== null ? `${formatVitalValue(temperature, values.temperatureC)} °C` : null,
        values.heartRateBpm !== null ? `Nabız ${formatVitalValue(heartRate, values.heartRateBpm)}/dk` : null,
        values.respiratoryRatePerMin !== null ? `Solunum ${formatVitalValue(respiratoryRate, values.respiratoryRatePerMin)}/dk` : null,
        values.weightKg !== null ? `${formatVitalValue(weight, values.weightKg)} kg` : null
    ]
        .filter((part): part is string => part !== null)
        .join(' · ');
}
