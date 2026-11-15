import type { ImportPetCandidateDto, ImportPetChoiceDto, ImportValueKind, ImportValueMappingDto } from '@/app/features/imports/models/import-api.model';

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

/** Adayın seçenek metni: ad, tür, ırk, renk, doğum, durum ve E-vet kaydı. */
export function petCandidateLabel(c: ImportPetCandidateDto): string {
    const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.birthDate ?? '');
    const parts = [
        c.species,
        c.breed,
        c.color,
        c.gender,
        birth ? `doğum ${birth[3]}.${birth[2]}.${birth[1]}` : c.birthDate ? `doğum ${c.birthDate}` : null,
        c.status,
        c.registeredOn ? `E-vet'e kayıt ${c.registeredOn}` : null
    ].filter(Boolean);

    return `${c.name ?? 'Adsız'} (E-vet ${c.petNo})${parts.length ? ' · ' + parts.join(' · ') : ''}`;
}

function entries(choices: ImportValueChoices): { kind: ImportValueKind; source: string; target: string }[] {
    return Object.entries(choices).map(([key, target]) => {
        const sep = key.indexOf('|');

        return { kind: key.slice(0, sep) as ImportValueKind, source: key.slice(sep + 1), target };
    });
}
