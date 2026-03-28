import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

export type AppointmentCanonicalType =
    | 'consultation'
    | 'checkup'
    | 'vaccination'
    | 'surgery'
    | 'grooming'
    | 'emergency'
    | 'followup'
    | 'dental'
    | 'imaging'
    | 'other';

interface AppointmentTypeDef {
    readonly canonical: AppointmentCanonicalType;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    /** Create/edit tür seçici */
    readonly write: boolean;
    readonly aliases: readonly string[];
}

interface AppointmentTypeMeta {
    readonly label: string;
    readonly severity: StatusTagSeverity;
}

export interface AppointmentTypeWriteOption {
    readonly label: string;
    readonly value: AppointmentCanonicalType;
}

/**
 * Randevu türü string’ini tek biçimde anahtara çevirir (`appointment-status` ile aynı kural).
 */
export function normalizeAppointmentType(type: string | null | undefined): string {
    return (type ?? '').toLowerCase().trim().replace(/\s+/g, '').replace(/-/g, '_');
}

const TYPE_DEFS: readonly AppointmentTypeDef[] = [
    {
        canonical: 'consultation',
        label: 'Konsültasyon',
        severity: 'secondary',
        write: true,
        aliases: []
    },
    {
        canonical: 'checkup',
        label: 'Genel kontrol',
        severity: 'secondary',
        write: true,
        aliases: []
    },
    {
        canonical: 'vaccination',
        label: 'Aşı',
        severity: 'info',
        write: true,
        aliases: ['aşı']
    },
    {
        canonical: 'surgery',
        label: 'Cerrahi',
        severity: 'warn',
        write: true,
        aliases: ['cerrahi']
    },
    {
        canonical: 'grooming',
        label: 'Bakım / tıraş',
        severity: 'secondary',
        write: true,
        aliases: []
    },
    {
        canonical: 'emergency',
        label: 'Acil',
        severity: 'danger',
        write: true,
        aliases: ['acil']
    },
    {
        canonical: 'followup',
        label: 'Kontrol',
        severity: 'secondary',
        write: true,
        aliases: ['follow_up', 'follow-up']
    },
    {
        canonical: 'dental',
        label: 'Diş',
        severity: 'secondary',
        write: true,
        aliases: []
    },
    {
        canonical: 'imaging',
        label: 'Görüntüleme',
        severity: 'secondary',
        write: true,
        aliases: []
    },
    {
        canonical: 'other',
        label: 'Diğer',
        severity: 'secondary',
        write: true,
        aliases: []
    }
];

function buildTypeMetaByNormalizedKey(defs: readonly AppointmentTypeDef[]): ReadonlyMap<string, AppointmentTypeMeta> {
    const map = new Map<string, AppointmentTypeMeta>();

    for (const def of defs) {
        const meta: AppointmentTypeMeta = {
            label: def.label,
            severity: def.severity
        };

        const seenInDef = new Set<string>();
        for (const rawKey of [def.canonical, ...def.aliases]) {
            const normalizedKey = normalizeAppointmentType(rawKey);
            if (normalizedKey === '' || seenInDef.has(normalizedKey)) {
                continue;
            }
            seenInDef.add(normalizedKey);
            if (map.has(normalizedKey)) {
                throw new Error(`Duplicate appointment type key detected: "${normalizedKey}"`);
            }
            map.set(normalizedKey, meta);
        }
    }

    return map;
}

const TYPE_META_BY_KEY = buildTypeMetaByNormalizedKey(TYPE_DEFS);

function resolveAppointmentTypeMeta(type: string | null | undefined): AppointmentTypeMeta | undefined {
    const normalizedKey = normalizeAppointmentType(type);
    return normalizedKey === '' ? undefined : TYPE_META_BY_KEY.get(normalizedKey);
}

/**
 * Liste ve detayda tür gösterimi — bilinen anahtarlar tek kaynaktan; aksi halde ham değer.
 */
export function appointmentTypeLabel(type: string | null | undefined): string {
    const meta = resolveAppointmentTypeMeta(type);
    if (meta) {
        return meta.label;
    }
    return normalizeAppointmentType(type) === '' ? EM : (type ?? '');
}

export function appointmentTypeSeverity(type: string | null | undefined): StatusTagSeverity {
    return resolveAppointmentTypeMeta(type)?.severity ?? 'secondary';
}

/** Create/edit tür seçici — `TYPE_DEFS` içinde `write: true`, tanım sırasıyla. */
export const APPOINTMENT_TYPE_WRITE_OPTIONS: ReadonlyArray<AppointmentTypeWriteOption> = TYPE_DEFS.filter((d) => d.write).map(
    (d) => ({
        label: d.label,
        value: d.canonical
    })
);
