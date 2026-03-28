import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { normalizeLookupKey } from '@/app/shared/utils/normalize-lookup-key.utils';

const EM = '—';

export type AppointmentCanonicalStatus =
    | 'scheduled'
    | 'pending'
    | 'confirmed'
    | 'draft'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show'
    | 'created'
    | 'active'
    | 'closed'
    | 'failed';

interface AppointmentStatusDef {
    readonly canonical: AppointmentCanonicalStatus;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    readonly write: boolean;
    readonly aliases: readonly string[];
}

interface AppointmentStatusMeta {
    readonly label: string;
    readonly severity: StatusTagSeverity;
}

export interface AppointmentWriteStatusOption {
    readonly label: string;
    readonly value: AppointmentCanonicalStatus;
}

/**
 * Randevu durumu string’ini tek biçimde anahtara çevirir.
 * - büyük/küçük harf farkını kaldırır
 * - baş/son boşlukları kaldırır
 * - iç boşlukları kaldırır
 * - `-` karakterini `_` ile tekilleştirir
 */
export function normalizeAppointmentStatus(status: string | null | undefined): string {
    return normalizeLookupKey(status);
}

const STATUS_DEFS: readonly AppointmentStatusDef[] = [
    {
        canonical: 'scheduled',
        label: 'Planlandı',
        severity: 'info',
        write: true,
        aliases: ['0', 'planlandı']
    },
    {
        canonical: 'pending',
        label: 'Bekliyor',
        severity: 'warn',
        write: true,
        aliases: ['bekliyor']
    },
    {
        canonical: 'confirmed',
        label: 'Onaylandı',
        severity: 'info',
        write: true,
        aliases: ['onaylandı']
    },
    {
        canonical: 'draft',
        label: 'Taslak',
        severity: 'secondary',
        write: true,
        aliases: []
    },
    {
        canonical: 'in_progress',
        label: 'Devam ediyor',
        severity: 'info',
        write: true,
        /** `in-progress` normalize ile `in_progress` ile aynı anahtara düşer; canonical yeterli. */
        aliases: ['inprogress']
    },
    {
        canonical: 'completed',
        label: 'Tamamlandı',
        severity: 'success',
        write: true,
        aliases: ['1', 'done', 'tamamlandı', 'completedsuccessfully']
    },
    {
        canonical: 'cancelled',
        label: 'İptal',
        severity: 'danger',
        write: true,
        aliases: ['2', 'canceled', 'iptal']
    },
    {
        canonical: 'no_show',
        label: 'Gelmedi',
        severity: 'warn',
        write: false,
        aliases: ['noshow', 'no-show', 'gelmedi']
    },
    {
        canonical: 'created',
        label: 'Oluşturuldu',
        severity: 'info',
        write: false,
        aliases: []
    },
    {
        canonical: 'active',
        label: 'Aktif',
        severity: 'info',
        write: false,
        aliases: []
    },
    {
        canonical: 'closed',
        label: 'Kapandı',
        severity: 'info',
        write: false,
        aliases: []
    },
    {
        canonical: 'failed',
        label: 'Başarısız',
        severity: 'danger',
        write: false,
        aliases: []
    }
];

function buildStatusMetaByNormalizedKey(defs: readonly AppointmentStatusDef[]): ReadonlyMap<string, AppointmentStatusMeta> {
    const map = new Map<string, AppointmentStatusMeta>();

    for (const def of defs) {
        const meta: AppointmentStatusMeta = {
            label: def.label,
            severity: def.severity
        };

        const seenInDef = new Set<string>();
        for (const rawKey of [def.canonical, ...def.aliases]) {
            const normalizedKey = normalizeAppointmentStatus(rawKey);

            if (normalizedKey === '' || seenInDef.has(normalizedKey)) {
                continue;
            }
            seenInDef.add(normalizedKey);

            if (map.has(normalizedKey)) {
                throw new Error(`Duplicate appointment status key detected: "${normalizedKey}"`);
            }

            map.set(normalizedKey, meta);
        }
    }

    return map;
}

const STATUS_META_BY_KEY = buildStatusMetaByNormalizedKey(STATUS_DEFS);

function resolveAppointmentStatusMeta(status: string | null | undefined): AppointmentStatusMeta | undefined {
    const normalizedKey = normalizeAppointmentStatus(status);
    return normalizedKey === '' ? undefined : STATUS_META_BY_KEY.get(normalizedKey);
}

export function appointmentStatusLabel(status: string | null | undefined): string {
    const meta = resolveAppointmentStatusMeta(status);
    if (meta) {
        return meta.label;
    }
    return normalizeAppointmentStatus(status) === '' ? EM : (status ?? '');
}

export function appointmentStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    return resolveAppointmentStatusMeta(status)?.severity ?? 'secondary';
}

/** Create/edit — yalnızca `write: true` olan durumlar. */
export const APPOINTMENT_WRITE_STATUS_OPTIONS: ReadonlyArray<AppointmentWriteStatusOption> = STATUS_DEFS.filter((def) => def.write).map(
    (def) => ({
        label: def.label,
        value: def.canonical
    })
);

const DEFAULT_WRITE_STATUS: AppointmentCanonicalStatus = 'scheduled';

/**
 * Detay API’den gelen ham durumu edit formundaki `p-select` canonical değerine çevirir.
 * Yazılabilir olmayan veya eşleşmeyen değerler için `scheduled` kullanılır.
 */
export function resolveAppointmentWriteStatusFormValue(raw: string | null | undefined): string {
    const n = normalizeAppointmentStatus(raw ?? '');
    if (!n) {
        return DEFAULT_WRITE_STATUS;
    }
    for (const def of STATUS_DEFS) {
        if (!def.write) {
            continue;
        }
        if (normalizeAppointmentStatus(def.canonical) === n) {
            return def.canonical;
        }
        for (const a of def.aliases) {
            if (normalizeAppointmentStatus(a) === n) {
                return def.canonical;
            }
        }
    }
    return DEFAULT_WRITE_STATUS;
}
