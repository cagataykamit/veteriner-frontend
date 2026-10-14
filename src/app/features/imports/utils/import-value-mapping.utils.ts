import type { ImportValueKind, ImportValueMappingDto } from '@/app/features/imports/models/import-api.model';

/** "Bu değeri atla" seçimi; hedef kimliği yerine kullanılır, istekte `targetId: null` olur. */
export const IMPORT_VALUE_SKIP = '__skip__';

/** Kullanıcının değer seçimleri: anahtar `tür|kaynak değer`, değer hedef kimliği veya `IMPORT_VALUE_SKIP`. */
export type ImportValueChoices = Readonly<Record<string, string>>;

export function valueChoiceKey(kind: ImportValueKind, source: string): string {
    return `${kind}|${source}`;
}

export function valueChoicesToRequest(choices: ImportValueChoices): ImportValueMappingDto[] {
    return Object.entries(choices).map(([key, target]) => {
        const sep = key.indexOf('|');
        return {
            kind: key.slice(0, sep) as ImportValueKind,
            source: key.slice(sep + 1),
            targetId: target === IMPORT_VALUE_SKIP ? null : target
        };
    });
}
