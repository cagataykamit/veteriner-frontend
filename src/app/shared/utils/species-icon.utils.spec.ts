import { DEFAULT_SPECIES_EMOJI, speciesEmoji } from './species-icon.utils';

describe('speciesEmoji', () => {
    it('katalog adlarını simgeye çevirir; büyük/küçük harf ve boşluk duyarsız', () => {
        expect(speciesEmoji('Köpek')).toBe('🐕');
        expect(speciesEmoji('KEDİ')).toBe('🐈');
        expect(speciesEmoji('  Kuş ')).toBe('🐦');
        expect(speciesEmoji('Gine Domuzu')).toBe('🐹');
        expect(speciesEmoji('Kobay (Gine Domuzu)')).toBe('🐹');
        expect(speciesEmoji('Ferret (Gelincik)')).toBe('🦔');
        expect(speciesEmoji('Sığır')).toBe('🐄');
    });

    it('bilinmeyen, özel veya boş türde pati döner', () => {
        expect(speciesEmoji('Aksolotl')).toBe(DEFAULT_SPECIES_EMOJI);
        expect(speciesEmoji('—')).toBe(DEFAULT_SPECIES_EMOJI);
        expect(speciesEmoji('')).toBe(DEFAULT_SPECIES_EMOJI);
        expect(speciesEmoji(null)).toBe(DEFAULT_SPECIES_EMOJI);
    });
});
