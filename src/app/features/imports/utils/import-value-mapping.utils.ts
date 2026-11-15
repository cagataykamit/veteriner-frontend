import type { ImportPetCandidateDto, ImportPetChoiceDto, ImportPetRowDto, ImportValueKind, ImportValueMappingDto } from '@/app/features/imports/models/import-api.model';

/** "Bu değeri atla" seçimi; hedef kimliği yerine kullanılır, istekte `targetId: null` olur. */
export const IMPORT_VALUE_SKIP = '__skip__';

/** Belirsiz hasta grubunda "ikisi aynı hayvan" seçiminin öneki: `merge:<hasta no>` (sözleşme 13.4). */
export const IMPORT_PET_MERGE_PREFIX = 'merge:';

/** Kullanıcının değer seçimleri: anahtar `tür|kaynak değer`, değer hedef kimliği veya `IMPORT_VALUE_SKIP`. */
export type ImportValueChoices = Readonly<Record<string, string>>;

export function valueChoiceKey(kind: ImportValueKind, source: string): string {
    return `${kind}|${source}`;
}

/** Değer eşlemeleri; belirsiz hasta seçimleri ayrı gider (`petChoicesToRequest`). */
export function valueChoicesToRequest(choices: ImportValueChoices): ImportValueMappingDto[] {
    return entries(choices)
        .filter((c) => c.kind !== 'pet')
        .map((c) => ({ kind: c.kind, source: c.source, targetId: c.target === IMPORT_VALUE_SKIP ? null : c.target }));
}

/** Belirsiz hasta grubu seçimleri: hasta no, atla (`petNo: null`) ya da tek hasta say (`merge`). */
export function petChoicesToRequest(choices: ImportValueChoices): ImportPetChoiceDto[] {
    return entries(choices)
        .filter((c) => c.kind === 'pet')
        .map((c) => {
            const merge = c.target.startsWith(IMPORT_PET_MERGE_PREFIX);

            return {
                reference: c.source,
                petNo: c.target === IMPORT_VALUE_SKIP ? null : merge ? c.target.slice(IMPORT_PET_MERGE_PREFIX.length) : c.target,
                merge
            };
        });
}

/** Belirsiz grubun aday hasta no'ları (`Belirsiz: a / b`). */
export function ambiguousPetNos(reference: string): string[] {
    const prefix = 'Belirsiz: ';

    return reference.startsWith(prefix) ? reference.slice(prefix.length).split(' / ') : [];
}

/**
 * Adayın adı ve E-vet numarası bir kez: aynı adlı hastalar ayrılırken adına numara eklenmiş olabilir (`Portakal (E-vet 614)`),
 * o zaman yeniden eklenmez.
 */
export function petDisplayName(c: ImportPetCandidateDto): string {
    const name = c.name ?? 'Adsız';

    return /\(E-vet [^)]*\)\s*$/.test(name) ? name : `${name} (E-vet ${c.petNo})`;
}

/** Adayın seçenek metni: ad, tür, ırk, renk, doğum, durum ve E-vet kaydı. */
export function petCandidateLabel(c: ImportPetCandidateDto): string {
    const parts = [c.species, c.breed, c.color, c.gender, c.birthDate ? `doğum ${isoDayLabel(c.birthDate)}` : null, c.status, c.registeredOn ? `E-vet'e kayıt ${c.registeredOn}` : null].filter(Boolean);

    return `${petDisplayName(c)}${parts.length ? ' · ' + parts.join(' · ') : ''}`;
}

/**
 * Adayların "aynı hayvan" sayılmasına engel farkı: `species` türleri farklı (aynı hayvan olamaz, seçenek sunulmaz), `looks` ırk ya
 * da cinsiyet farklı (seçenek farkı yazılarak en sonda); bilinmeyen değer fark sayılmaz.
 */
export function petMergeConflict(candidates: readonly ImportPetCandidateDto[]): 'species' | 'looks' | null {
    const differs = (pick: (c: ImportPetCandidateDto) => string | null) => new Set(candidates.map((c) => pick(c)?.trim().toLocaleLowerCase('tr')).filter((v) => !!v)).size > 1;

    if (differs((c) => c.species)) {
        return 'species';
    }

    return differs((c) => c.breed) || differs((c) => c.gender) ? 'looks' : null;
}

/** Belirsiz grubun kaydı tek satırda: `12.10.2024 · Aşı: KUDUZ`, `01.03.2024 · Muayene: İştahsızlık`. */
export function petRowLabel(r: ImportPetRowDto): string {
    const date = r.date ? isoDayLabel(r.date) : 'Tarihsiz';
    const title = r.table === 'vaccinations' ? `Aşı: ${r.title ?? 'adsız'}` : r.table === 'appointments' ? `Randevu${r.title ? ' (' + r.title + ')' : ''}` : (r.title ?? 'Kayıt');

    return `${date} · ${title}${r.summary ? (r.table === 'vaccinations' ? ' · ' : ': ') + r.summary : ''}`;
}

/** `yyyy-aa-gg` → `gg.aa.yyyy`; başka biçim olduğu gibi. */
function isoDayLabel(value: string): string {
    const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    return day ? `${day[3]}.${day[2]}.${day[1]}` : value;
}

function entries(choices: ImportValueChoices): { kind: ImportValueKind; source: string; target: string }[] {
    return Object.entries(choices).map(([key, target]) => {
        const sep = key.indexOf('|');

        return { kind: key.slice(0, sep) as ImportValueKind, source: key.slice(sep + 1), target };
    });
}
