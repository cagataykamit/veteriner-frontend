import { map, type Observable } from 'rxjs';
import type { SpeciesService } from '@/app/entities/species/services/species.service';

const TR_TO_ASCII: Record<string, string> = { ç: 'C', ğ: 'G', ı: 'I', i: 'I', ö: 'O', ş: 'S', ü: 'U', Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };

/** Seçicide yazılan addan tür kodu (en çok 32, büyük harf, ASCII): "Gine domuzu" → "GINE_DOMUZU". */
export function speciesCodeFromName(name: string): string {
    return name
        .trim()
        .replace(/[çğıiöşüÇĞİÖŞÜ]/g, (c) => TR_TO_ASCII[c] ?? c)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
}

/** Yerinde ekleme (O1): tür yalnız adıyla oluşur, kod addan türetilir; yeni türün kimliğini döndürür. */
export function createSpeciesByName(service: SpeciesService, name: string): Observable<string> {
    const trimmed = name.trim();

    return service.createSpecies({ code: speciesCodeFromName(trimmed) || 'TUR', name: trimmed, isActive: true, displayOrder: 0 }).pipe(map(({ id }) => id));
}
