import type { Type } from '@angular/core';
import type { SectionType } from '../model/site.model';
import { FRIENDLY_PACK } from './packs/friendly/friendly.pack';
import { MODERN_PACK } from './packs/modern/modern.pack';
import { NATURE_PACK } from './packs/nature/nature.pack';
import { PREMIUM_PACK } from './packs/premium/premium.pack';

/**
 * Bölüm kayıt defteri: bölüm türü + alternatif anahtarı + bileşen + etiket. Sihirbaz seçenekleri buradan okur, motor bileşeni
 * buradan alır. Yeni tasarım paketi yalnız bu listeye eklenir; sihirbaz kodu değişmez.
 */
export interface SectionAlternative {
    readonly type: SectionType;
    readonly key: string;
    readonly label: string;
    readonly note: string;
    readonly component: Type<unknown>;
}

const PACKS: readonly (readonly SectionAlternative[])[] = [MODERN_PACK, PREMIUM_PACK, FRIENDLY_PACK, NATURE_PACK];

export const SECTION_REGISTRY: readonly SectionAlternative[] = PACKS.flat();

export function sectionAlternatives(type: SectionType): readonly SectionAlternative[] {
    return SECTION_REGISTRY.filter((alternative) => alternative.type === type);
}

/** Kayıtta olmayan anahtar (eski kayıt, kaldırılmış paket) sayfayı bozmaz: türün ilk alternatifi çizilir. */
export function findAlternative(type: SectionType, key: string): SectionAlternative {
    const list = sectionAlternatives(type);

    return list.find((alternative) => alternative.key === key) ?? list[0];
}
