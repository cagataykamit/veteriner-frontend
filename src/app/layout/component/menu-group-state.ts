const STORAGE_KEY = 'vetinity.menu.groups';

/** Grup başlığı → kullanıcının açık (`true`) / kapalı (`false`) tercihi. */
export type MenuGroupPreferences = Readonly<Record<string, boolean>>;

/** Depo erişilemez veya bozuksa boş tercih döner (özel pencere, engelli site verisi). */
export function readMenuGroupPreferences(): MenuGroupPreferences {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');

        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }

        return Object.fromEntries(Object.entries(parsed).filter(([, open]) => typeof open === 'boolean'));
    } catch {
        return {};
    }
}

export function writeMenuGroupPreferences(preferences: MenuGroupPreferences): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        // Tercih yalnız bu oturumda geçerli kalır.
    }
}
