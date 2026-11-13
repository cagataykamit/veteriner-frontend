/** GET ref-data — PetColors kataloğu (Swagger ile doğrulanmalı). */
export interface PetColorListItemDto {
    id: string;
    name?: string | null;
    /** Bazı yanıtlarda renk adı bu alanda gelebilir. */
    colorName?: string | null;
    /** `Color` (renk) ya da `Pattern` (desen); eski yanıtta yok → renk. */
    kind?: PetColorKind;
}

export type PetColorKind = 'Color' | 'Pattern';
