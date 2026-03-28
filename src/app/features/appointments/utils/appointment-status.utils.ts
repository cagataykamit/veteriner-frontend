import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

const EM = '—';

/** Tek kaynak: canonical `value`, görünen `label`, tag `severity`, form seçiminde kullanım. */
interface AppointmentStatusDef {
    readonly canonical: string;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    /** Create/edit dropdown’da göster */
    readonly write: boolean;
    /** API / legacy / dil varyantları — `normalizeAppointmentStatus` ile indekslenir */
    readonly aliases: readonly string[];
}

/**
 * Randevu durumu string’ini tek biçimde anahtara çevirir (META ve eşleştirme için).
 * Boşluk ve tire tekilleştirilir; büyük/küçük harf yok sayılır.
 */
export function normalizeAppointmentStatus(status: string | null | undefined): string {
    if (status == null || status === '') {
        return '';
    }
    return status.toLowerCase().replace(/\s+/g, '').replace(/-/g, '_');
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
        aliases: ['inprogress', 'in-progress']
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

type StatusMeta = Pick<AppointmentStatusDef, 'label' | 'severity'>;

function buildMetaByNormalizedKey(): ReadonlyMap<string, StatusMeta> {
    const m = new Map<string, StatusMeta>();
    for (const def of STATUS_DEFS) {
        const meta: StatusMeta = { label: def.label, severity: def.severity };
        const phrases = [def.canonical, ...def.aliases];
        for (const p of phrases) {
            const key = normalizeAppointmentStatus(p);
            if (key !== '') {
                m.set(key, meta);
            }
        }
    }
    return m;
}

const STATUS_META_BY_KEY = buildMetaByNormalizedKey();

function resolveStatusMeta(status: string | null | undefined): StatusMeta | undefined {
    if (status == null || status === '') {
        return undefined;
    }
    return STATUS_META_BY_KEY.get(normalizeAppointmentStatus(status));
}

export function appointmentStatusLabel(status: string | null | undefined): string {
    if (status == null || status === '') {
        return EM;
    }
    const meta = resolveStatusMeta(status);
    return meta?.label ?? status;
}

export function appointmentStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    const meta = resolveStatusMeta(status);
    return meta?.severity ?? 'secondary';
}

/** Create/edit — `STATUS_DEFS` içinde `write: true` olanlar, tanım sırasıyla. */
export const APPOINTMENT_WRITE_STATUS_OPTIONS: ReadonlyArray<{ label: string; value: string }> = STATUS_DEFS.filter(
    (d) => d.write
).map((d) => ({ label: d.label, value: d.canonical }));
