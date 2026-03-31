import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { normalizeLookupKey } from '@/app/shared/utils/normalize-lookup-key.utils';

const EM = '—';

/** Backend `AppointmentType` int enum — resmi sözleşme. */
export type BackendAppointmentType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const APPOINTMENT_TYPE_ENUM_MIN = 0;
export const APPOINTMENT_TYPE_ENUM_MAX = 6;

interface AppointmentTypeEnumDef {
    readonly value: BackendAppointmentType;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    /** Swagger / C# adı */
    readonly swaggerName: string;
}

/** Sıra backend enum ile birebir (0…6). */
const APPOINTMENT_TYPE_ENUM_DEFS: readonly AppointmentTypeEnumDef[] = [
    { value: 0, label: 'Muayene', severity: 'info', swaggerName: 'Examination' },
    { value: 1, label: 'Aşı', severity: 'info', swaggerName: 'Vaccination' },
    { value: 2, label: 'Genel kontrol', severity: 'secondary', swaggerName: 'Checkup' },
    { value: 3, label: 'Cerrahi', severity: 'warn', swaggerName: 'Surgery' },
    { value: 4, label: 'Bakım / tıraş', severity: 'secondary', swaggerName: 'Grooming' },
    { value: 5, label: 'Konsültasyon', severity: 'secondary', swaggerName: 'Consultation' },
    { value: 6, label: 'Diğer', severity: 'secondary', swaggerName: 'Other' }
];

const LABEL_BY_VALUE = new Map<number, string>(
    APPOINTMENT_TYPE_ENUM_DEFS.map((d) => [d.value, d.label])
);
const SEVERITY_BY_VALUE = new Map<number, StatusTagSeverity>(
    APPOINTMENT_TYPE_ENUM_DEFS.map((d) => [d.value, d.severity])
);

/** İngilizce / normalize isim → enum değeri (display çözümü; API’deki `appointmentTypeName` için). */
const VALUE_BY_NORMALIZED_KEY = buildValueByNormalizedKey(APPOINTMENT_TYPE_ENUM_DEFS);

function buildValueByNormalizedKey(defs: readonly AppointmentTypeEnumDef[]): Map<string, BackendAppointmentType> {
    const m = new Map<string, BackendAppointmentType>();
    for (const d of defs) {
        for (const raw of [d.swaggerName, String(d.value), d.label]) {
            const k = normalizeLookupKey(raw);
            if (k && !m.has(k)) {
                m.set(k, d.value);
            }
        }
    }
    /** Eski istemci anahtarları (diğer modüllerden gelen string `type` ile uyum; yalnız güvenli birebir eşler). */
    const legacy: ReadonlyArray<readonly [string, BackendAppointmentType]> = [
        ['consultation', 5],
        ['checkup', 2],
        ['vaccination', 1],
        ['aşı', 1],
        ['surgery', 3],
        ['cerrahi', 3],
        ['grooming', 4],
        ['other', 6]
    ];
    for (const [alias, val] of legacy) {
        const k = normalizeLookupKey(alias);
        if (k && !m.has(k)) {
            m.set(k, val);
        }
    }
    return m;
}

/** Backend enum’da olmayan eski `type` string’leri — yalnız etiket gösterimi. */
const LEGACY_STRING_LABEL = new Map<string, string>([
    [normalizeLookupKey('emergency'), 'Acil'],
    [normalizeLookupKey('acil'), 'Acil'],
    [normalizeLookupKey('followup'), 'Kontrol'],
    [normalizeLookupKey('follow-up'), 'Kontrol'],
    [normalizeLookupKey('follow_up'), 'Kontrol'],
    [normalizeLookupKey('dental'), 'Diş'],
    [normalizeLookupKey('imaging'), 'Görüntüleme']
]);

export interface AppointmentTypeWriteOption {
    readonly label: string;
    readonly value: BackendAppointmentType;
}

/** Create/edit — backend sayısal enum değerleri. */
export const APPOINTMENT_TYPE_WRITE_OPTIONS: ReadonlyArray<AppointmentTypeWriteOption> = APPOINTMENT_TYPE_ENUM_DEFS.map((d) => ({
    label: d.label,
    value: d.value
}));

export function isKnownAppointmentTypeEnum(value: number): value is BackendAppointmentType {
    return Number.isInteger(value) && value >= APPOINTMENT_TYPE_ENUM_MIN && value <= APPOINTMENT_TYPE_ENUM_MAX;
}

/**
 * API ham değerini 0…6 enum’a çevirir; aralık dışı / bilinmeyen için `null` (sessizce yanlış tipe map etmeyiz).
 */
export function parseAppointmentTypeEnumValue(raw: unknown): number | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const i = Math.trunc(raw);
        return isKnownAppointmentTypeEnum(i) ? i : null;
    }
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t) {
            return null;
        }
        if (/^-?\d+$/.test(t)) {
            const i = Number.parseInt(t, 10);
            return isKnownAppointmentTypeEnum(i) ? i : null;
        }
    }
    return null;
}

export function tryResolveAppointmentTypeFromFreeText(text: string | null | undefined): number | null {
    if (text == null || !String(text).trim()) {
        return null;
    }
    const k = normalizeLookupKey(text);
    if (!k) {
        return null;
    }
    const v = VALUE_BY_NORMALIZED_KEY.get(k);
    return v !== undefined ? v : null;
}

/**
 * Edit/create form preload: önce sayısal enum, yoksa API adı / serbest metin çözümü; eşleşme yoksa `null`.
 */
export function resolveAppointmentWriteTypeFormValue(numeric: number | null, nameFallback?: string | null): number | null {
    if (numeric !== null && isKnownAppointmentTypeEnum(numeric)) {
        return numeric;
    }
    if (nameFallback?.trim()) {
        const fromName = tryResolveAppointmentTypeFromFreeText(nameFallback);
        if (fromName !== null) {
            return fromName;
        }
    }
    return null;
}

/**
 * Liste / detay / gömülü satırlar: `number`, sayı string, enum adı veya (sınırlı) legacy string.
 */
export function appointmentTypeLabel(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
        return EM;
    }
    if (typeof value === 'number') {
        if (isKnownAppointmentTypeEnum(value)) {
            return LABEL_BY_VALUE.get(value) ?? EM;
        }
        return `Randevu Türü (${value})`;
    }
    const s = value.trim();
    if (!s) {
        return EM;
    }
    const asNum = parseAppointmentTypeEnumValue(s);
    if (asNum !== null) {
        return LABEL_BY_VALUE.get(asNum) ?? EM;
    }
    const fromText = tryResolveAppointmentTypeFromFreeText(s);
    if (fromText !== null) {
        return LABEL_BY_VALUE.get(fromText) ?? EM;
    }
    const legacy = LEGACY_STRING_LABEL.get(normalizeLookupKey(s));
    if (legacy) {
        return legacy;
    }
    return s;
}

/**
 * Randevu satırı: öncelik bilinen enum sayısı; yoksa API’deki `appointmentTypeName`; yoksa sayısal ham gösterim.
 */
export function appointmentTypeDisplayLabel(appointmentType: number | null | undefined, apiTypeName?: string | null): string {
    if (appointmentType !== null && appointmentType !== undefined && isKnownAppointmentTypeEnum(appointmentType)) {
        return LABEL_BY_VALUE.get(appointmentType) ?? EM;
    }
    if (apiTypeName?.trim()) {
        const fromName = tryResolveAppointmentTypeFromFreeText(apiTypeName);
        if (fromName !== null) {
            return LABEL_BY_VALUE.get(fromName) ?? apiTypeName.trim();
        }
        return apiTypeName.trim();
    }
    if (appointmentType !== null && appointmentType !== undefined) {
        return `Randevu Türü (${appointmentType})`;
    }
    return EM;
}

export function appointmentTypeSeverity(value: number | string | null | undefined): StatusTagSeverity {
    if (value === null || value === undefined) {
        return 'secondary';
    }
    let n: number | null = null;
    if (typeof value === 'number') {
        n = isKnownAppointmentTypeEnum(value) ? value : null;
    } else {
        const s = value.trim();
        if (s) {
            n = parseAppointmentTypeEnumValue(s) ?? tryResolveAppointmentTypeFromFreeText(s);
        }
    }
    if (n !== null && isKnownAppointmentTypeEnum(n)) {
        return SEVERITY_BY_VALUE.get(n) ?? 'secondary';
    }
    return 'secondary';
}

export function appointmentTypeDisplaySeverity(appointmentType: number | null | undefined): StatusTagSeverity {
    if (appointmentType !== null && appointmentType !== undefined && isKnownAppointmentTypeEnum(appointmentType)) {
        return SEVERITY_BY_VALUE.get(appointmentType) ?? 'secondary';
    }
    return 'secondary';
}
