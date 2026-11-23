import { type CharacterKey, conceptByKey, contrast, designFromConcept, ensureContrast, hexToHsl, hslToHex, mix, SITE_CONCEPTS, type SiteConfig, type SiteDesign } from '@site-engine';

/**
 * "Bana uygun tasarım öner" (ADR-045 K5): yapay zekâ yok, açıklanabilir kurallar. Kliniğin karakter seçimi ve ana rengi konsepte puan
 * verir; logo rengi varsa palet ondan kurulur. Düzen tektir (K-01). Sonuç bir tasarımdır, klinik uygular ya da uygulamaz.
 */
export interface DesignSuggestion {
    readonly design: SiteDesign;
    readonly conceptName: string;
    /** Tek cümle: neden bu tasarım. */
    readonly reason: string;
}

const CHARACTER_CONCEPT: Readonly<Record<CharacterKey, string>> = { sade: 'modern', zarif: 'premium', samimi: 'friendly', dogal: 'nature' };

const CHARACTER_LABEL: Readonly<Record<CharacterKey, string>> = { sade: 'sade', zarif: 'zarif', samimi: 'samimi', dogal: 'doğal' };

interface ToneRead {
    readonly concept: string;
    readonly label: string;
}

/** Rengin tonu ve doygunluğu hangi konsepte yakın. */
function readTone(hex: string): ToneRead {
    const { h, s, l } = hexToHsl(hex);

    if (s < 0.14) return { concept: 'modern', label: 'nötr tonu' };

    if (l < 0.72 && s < 0.5 && h >= 28 && h < 62) return { concept: 'premium', label: 'pirinç tonu' };

    if (h >= 62 && h < 170) return { concept: 'nature', label: 'yeşil tonu' };

    if (h < 62 || h >= 330) return { concept: 'friendly', label: 'sıcak tonu' };

    return { concept: 'modern', label: 'serin tonu' };
}

/** Kliniğin ana renginden uyumlu ikincil ve vurgu üretir; kontrast zemine göre token'da ayrıca güvenceye alınır. */
function paletteFrom(primary: string): SiteDesign['colors'] {
    const { h, s, l } = hexToHsl(primary);
    const readable = ensureContrast(primary, '#ffffff');

    return {
        primary: contrast(primary, '#ffffff') >= 3 ? primary : readable,
        secondary: mix(readable, '#8a8a84', 0.55),
        accent: hslToHex({ h: (h + 150) % 360, s: Math.min(0.72, Math.max(0.42, s)), l: Math.min(0.42, Math.max(0.3, l)) })
    };
}

export function suggestDesign(config: SiteConfig, logoColor: string | null): DesignSuggestion {
    const { design } = config;
    const baseColor = logoColor ?? design.colors.primary;
    const tone = readTone(baseColor);
    const scores = new Map<string, number>(SITE_CONCEPTS.map((concept) => [concept.key, 0]));

    scores.set(CHARACTER_CONCEPT[design.character], (scores.get(CHARACTER_CONCEPT[design.character]) ?? 0) + 3);
    scores.set(tone.concept, (scores.get(tone.concept) ?? 0) + 2);

    const conceptKey = [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const concept = conceptByKey(conceptKey);
    const base = designFromConcept(concept);

    const colors = logoColor ? paletteFrom(logoColor) : base.colors;
    const colorSource = logoColor ? `logonuzun ${tone.label}` : `ana renginizin ${tone.label}`;
    const character = `"${CHARACTER_LABEL[design.character]}" seçiminiz`;
    const why =
        tone.concept === conceptKey
            ? `${character} ve ${colorSource} ${concept.name} konseptine uyuyor`
            : logoColor
              ? `${character} ${concept.name} konseptini belirledi, paleti ${colorSource} üzerinden kurdum`
              : `${character} ${concept.name} konseptini belirledi, renkleri de konseptin paletine çevirdim`;

    return {
        design: { ...base, character: design.character, colors },
        conceptName: concept.name,
        reason: `${why}.`
    };
}
