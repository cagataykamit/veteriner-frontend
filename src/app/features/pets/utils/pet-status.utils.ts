import { normalizeLookupKey } from '@/app/shared/utils/normalize-lookup-key.utils';

const EM = '—';

/**
 * Hayvan durumu (`PET_STATUS_CLIENT_CONTACT_API_CONTRACT.md` §1, K1): yalnız `Active` / `Deceased`.
 * Vefat eden hayvanın geçmişi okunur ve düzenlenir; yalnız yeni randevu, geliş ve muayene açılmaz (sunucu 409 `Pets.Deceased`).
 */
export type PetLifeStatus = 'Active' | 'Deceased';

/** API değeri (`"Deceased"` veya enum `2`) → durum; bilinmeyen/eksik değer önceki davranışla uyumlu olarak `Active`. */
export function parsePetLifeStatus(raw: unknown): PetLifeStatus {
    if (raw === 2 || raw === '2' || (typeof raw === 'string' && normalizeLookupKey(raw) === 'deceased')) {
        return 'Deceased';
    }

    return 'Active';
}

export function petLifeStatusLabel(status: PetLifeStatus): string {
    return status === 'Deceased' ? 'Vefat' : 'Aktif';
}

/** Hayvan listesi durum süzgeci: değer verilmezse sunucu tümünü döndürür (önceki davranış). */
export const PET_LIFE_STATUS_FILTER_OPTIONS: ReadonlyArray<{ label: string; value: PetLifeStatus }> = [
    { label: 'Aktif', value: 'Active' },
    { label: 'Vefat', value: 'Deceased' }
];

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

export interface PetGenderWriteOption {
    readonly label: string;
    readonly value: PetCanonicalGender;
}

export function normalizePetGender(value: string | null | undefined): string {
    return normalizeLookupKey(value);
}

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

const GENDER_META_BY_KEY = buildMetaMap(
    GENDER_DEFS.map((d) => ({
        canonical: d.canonical,
        aliases: d.aliases,
        meta: { label: d.label } satisfies PetGenderMeta
    }))
);

function resolvePetGenderMeta(gender: string | null | undefined): PetGenderMeta | undefined {
    const nk = normalizeLookupKey(gender);

    return nk === '' ? undefined : GENDER_META_BY_KEY.get(nk);
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
