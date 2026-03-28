import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { normalizeLookupKey } from '@/app/shared/utils/normalize-lookup-key.utils';

const EM = '—';

export type PetCanonicalStatus = 'active' | 'inactive';

interface PetStatusDef {
    readonly canonical: PetCanonicalStatus;
    readonly label: string;
    readonly severity: StatusTagSeverity;
    /** Create/edit + liste filtresi (canonical değerler) */
    readonly write: boolean;
    readonly aliases: readonly string[];
}

interface PetStatusMeta {
    readonly label: string;
    readonly severity: StatusTagSeverity;
}

export type PetCanonicalGender = 'male' | 'female';

interface PetGenderDef {
    readonly canonical: PetCanonicalGender;
    readonly label: string;
    readonly write: boolean;
    readonly aliases: readonly string[];
}

interface PetGenderMeta {
    readonly label: string;
}

export interface PetStatusWriteOption {
    readonly label: string;
    readonly value: PetCanonicalStatus;
}

export interface PetGenderWriteOption {
    readonly label: string;
    readonly value: PetCanonicalGender;
}

/** Randevu / appointment util’leri ile aynı normalizasyon kuralı. */
export function normalizePetStatus(value: string | null | undefined): string {
    return normalizeLookupKey(value);
}

export function normalizePetGender(value: string | null | undefined): string {
    return normalizeLookupKey(value);
}

const STATUS_DEFS: readonly PetStatusDef[] = [
    {
        canonical: 'active',
        label: 'Aktif',
        severity: 'success',
        write: true,
        aliases: ['aktif']
    },
    {
        canonical: 'inactive',
        label: 'Pasif',
        severity: 'warn',
        write: true,
        aliases: ['pasif']
    }
];

const GENDER_DEFS: readonly PetGenderDef[] = [
    {
        canonical: 'male',
        label: 'Erkek',
        write: true,
        aliases: ['m', 'erkek', '0']
    },
    {
        canonical: 'female',
        label: 'Dişi',
        write: true,
        aliases: ['f', 'dişi', 'disi', '1']
    }
];

function buildMetaMap<TMeta>(
    defs: ReadonlyArray<{ canonical: string; aliases: readonly string[]; meta: TMeta }>
): ReadonlyMap<string, TMeta> {
    const map = new Map<string, TMeta>();

    for (const def of defs) {
        const seenInDef = new Set<string>();
        for (const rawKey of [def.canonical, ...def.aliases]) {
            const nk = normalizeLookupKey(rawKey);
            if (nk === '' || seenInDef.has(nk)) {
                continue;
            }
            seenInDef.add(nk);
            if (map.has(nk)) {
                throw new Error(`Duplicate pet metadata key: "${nk}"`);
            }
            map.set(nk, def.meta);
        }
    }

    return map;
}

const STATUS_META_BY_KEY = buildMetaMap(
    STATUS_DEFS.map((d) => ({
        canonical: d.canonical,
        aliases: d.aliases,
        meta: { label: d.label, severity: d.severity } satisfies PetStatusMeta
    }))
);

const GENDER_META_BY_KEY = buildMetaMap(
    GENDER_DEFS.map((d) => ({
        canonical: d.canonical,
        aliases: d.aliases,
        meta: { label: d.label } satisfies PetGenderMeta
    }))
);

function resolvePetStatusMeta(status: string | null | undefined): PetStatusMeta | undefined {
    const nk = normalizeLookupKey(status);
    return nk === '' ? undefined : STATUS_META_BY_KEY.get(nk);
}

function resolvePetGenderMeta(gender: string | null | undefined): PetGenderMeta | undefined {
    const nk = normalizeLookupKey(gender);
    return nk === '' ? undefined : GENDER_META_BY_KEY.get(nk);
}

export function petStatusLabel(status: string | null | undefined): string {
    const meta = resolvePetStatusMeta(status);
    if (meta) {
        return meta.label;
    }
    return normalizeLookupKey(status) === '' ? EM : (status ?? '');
}

export function petStatusSeverity(status: string | null | undefined): StatusTagSeverity {
    if (status == null || status === '') {
        return 'secondary';
    }
    /** Bilinmeyen backend değerleri önceki davranışla uyumlu: `info`. */
    return resolvePetStatusMeta(status)?.severity ?? 'info';
}

export function petGenderLabel(gender: string | null | undefined): string {
    if (gender == null || gender === '' || gender === EM) {
        return EM;
    }
    const meta = resolvePetGenderMeta(gender);
    if (meta) {
        return meta.label;
    }
    return gender;
}

/** Create/edit — tek kaynaktan. */
export const PET_STATUS_FORM_OPTIONS: ReadonlyArray<PetStatusWriteOption> = STATUS_DEFS.filter((d) => d.write).map((d) => ({
    label: d.label,
    value: d.canonical
}));

export const PET_GENDER_FORM_OPTIONS: ReadonlyArray<PetGenderWriteOption> = GENDER_DEFS.filter((d) => d.write).map((d) => ({
    label: d.label,
    value: d.canonical
}));

/**
 * API’den gelen ham cinsiyeti edit form `p-select` değerine (`male` / `female`) çevirir.
 * Backend enum: 1 = Male, 2 = Female (number veya "1"/"2" string).
 * Metin: `male` / `erkek` / `female` / `dişi` vb. (alias tablosu).
 * Eşleşmezse boş string (clear ile uyumlu).
 */
export function resolvePetGenderFormValue(raw: string | number | null | undefined): string {
    if (raw === null || raw === undefined) {
        return '';
    }
    if (typeof raw === 'number') {
        if (raw === 1) {
            return 'male';
        }
        if (raw === 2) {
            return 'female';
        }
        return '';
    }
    const s = String(raw).trim();
    if (!s) {
        return '';
    }
    if (s === '1') {
        return 'male';
    }
    if (s === '2') {
        return 'female';
    }
    const n = normalizePetGender(s);
    if (!n) {
        return '';
    }
    for (const def of GENDER_DEFS) {
        if (!def.write) {
            continue;
        }
        if (normalizePetGender(def.canonical) === n) {
            return def.canonical;
        }
        for (const a of def.aliases) {
            if (normalizePetGender(a) === n) {
                return def.canonical;
            }
        }
    }
    return '';
}

/**
 * Liste filtresi: “Tümü” + canonical durumlar (`STATUS_DEFS` ile uyumlu değerler).
 */
export const PET_STATUS_FILTER_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Tümü', value: '' },
    ...PET_STATUS_FORM_OPTIONS.map((o) => ({ label: o.label, value: o.value }))
];
