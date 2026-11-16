/**
 * Tanıtım sitesinin dört renk tonu (nane, gök, güneş, leylak): günün dört adımı ve Özellikler bölümleri sırayla bu tonları döner.
 * Tonların açık ve koyu tema renkleri yalnız `public-site.scss` içindeki `$public-site-tones` haritasındadır; burada yalnız sıra var.
 * Birincil düğme ve vurgu her zaman lacivert ve teal kalır, tonlar zeminde ve küçük işaretlerde kullanılır.
 */
export const PUBLIC_SITE_TONES = ['mint', 'sky', 'sun', 'lilac'] as const;

export type PublicSiteTone = (typeof PUBLIC_SITE_TONES)[number];

/** Sıradaki öğenin ton sınıfı (`ps-tone-mint` …); dört tondan sonra başa döner. */
export function publicSiteToneClass(index: number): string {
    return `ps-tone-${PUBLIC_SITE_TONES[index % PUBLIC_SITE_TONES.length]}`;
}
