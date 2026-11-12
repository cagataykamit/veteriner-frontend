/**
 * Tür simgesi (emoji): hasta satırları ve kartlarda türü tek bakışta ayırt ettirir.
 * Eşleme katalog adıyla yapılır (tohum: Kedi, Köpek, Kuş, … `SpeciesAndBreedCatalogSeeder`); kliniğin eklediği
 * özel türler ve bilinmeyen adlar için pati. Ad büyük/küçük harf duyarsız, baştaki/sondaki boşluk yok sayılır.
 */
const SPECIES_EMOJI: ReadonlyArray<readonly [names: readonly string[], emoji: string]> = [
    [['kedi', 'cat'], '🐈'],
    [['köpek', 'dog'], '🐕'],
    [['kuş', 'papağan', 'muhabbet kuşu', 'kanarya', 'bird'], '🐦'],
    [['tavşan', 'rabbit'], '🐇'],
    [['gine domuzu', 'kobay (gine domuzu)', 'hamster', 'çinçilla', 'kobay', 'fare', 'sıçan'], '🐹'],
    [['ferret (gelincik)', 'ferret', 'gelincik', 'kirpi'], '🦔'],
    [['kaplumbağa'], '🐢'],
    [['kertenkele', 'sürüngen', 'iguana'], '🦎'],
    [['yılan'], '🐍'],
    [['balık', 'fish'], '🐟'],
    [['at', 'horse'], '🐎'],
    [['eşek', 'katır'], '🫏'],
    [['sığır', 'inek', 'dana', 'boğa'], '🐄'],
    [['koyun', 'kuzu'], '🐑'],
    [['keçi', 'oğlak'], '🐐'],
    [['domuz'], '🐖'],
    [['tavuk', 'horoz', 'civciv'], '🐔'],
    [['ördek', 'kaz'], '🦆'],
    [['hindi'], '🦃']
];

export const DEFAULT_SPECIES_EMOJI = '🐾';

export function speciesEmoji(speciesName: string | null | undefined): string {
    const key = (speciesName ?? '').trim().toLocaleLowerCase('tr-TR');

    if (!key) {
        return DEFAULT_SPECIES_EMOJI;
    }

    return SPECIES_EMOJI.find(([names]) => names.includes(key))?.[1] ?? DEFAULT_SPECIES_EMOJI;
}
