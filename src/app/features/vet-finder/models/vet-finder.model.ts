/** Veteriner bul kaydı (Veteriner `docs/VET_FINDER_API_CONTRACT.md` §2, ADR-047). */
export type VetFinderMissing = 'district' | 'address' | 'phone' | 'workingHours';

export interface VetFinderServiceOption {
    readonly key: string;
    readonly name: string;
}

export interface ClinicVetFinderListingDto {
    readonly clinicId: string;
    readonly isListed: boolean;
    readonly services: readonly string[];
    readonly latitude: number | null;
    readonly longitude: number | null;
    /** Kliniğin görüneceği sayfa: "/veteriner/istanbul/kadikoy". */
    readonly publicPath: string;
    /** Kartı zayıflatan eksik klinik bilgisi; listelenmeyi engellemez. */
    readonly missing: readonly VetFinderMissing[];
    readonly availableServices: readonly VetFinderServiceOption[];
}

export interface VetFinderListingInput {
    readonly isListed: boolean;
    readonly services: readonly string[];
    readonly latitude: number | null;
    readonly longitude: number | null;
}

export const VET_FINDER_MISSING_LABELS: Readonly<Record<VetFinderMissing, string>> = {
    district: 'İlçe girilmemiş: klinik yalnız il sayfasında görünür.',
    address: 'Adres girilmemiş.',
    phone: 'Telefon girilmemiş: online randevu kapalıysa kartta arama düğmesi olmaz.',
    workingHours: 'Çalışma saati girilmemiş: kart "şu an açık" görünmez.'
};

/** Konum yalnız Türkiye içinde kabul edilir (backend `ClinicVetFinderListing` ile aynı sınır). */
const TURKEY = { minLat: 35.5, maxLat: 42.5, minLng: 25.5, maxLng: 45 } as const;

/**
 * "40.9901, 29.0287" → enlem/boylam. Harita uygulamalarının kopyaladığı biçim: virgül ya da boşlukla ayrılmış iki ondalık sayı.
 * Boş metin konum yok demektir (`null`); okunamayan ya da Türkiye dışı değer `'invalid'`.
 */
export function parseCoordinates(text: string): { readonly latitude: number; readonly longitude: number } | null | 'invalid' {
    const trimmed = text.trim();

    if (!trimmed) return null;

    const match = trimmed.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);

    if (!match) return 'invalid';

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (latitude < TURKEY.minLat || latitude > TURKEY.maxLat || longitude < TURKEY.minLng || longitude > TURKEY.maxLng) return 'invalid';

    return { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6 };
}

export function formatCoordinates(latitude: number | null, longitude: number | null): string {
    return latitude === null || longitude === null ? '' : `${latitude}, ${longitude}`;
}
