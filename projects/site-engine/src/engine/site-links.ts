import type { SiteClinic, SiteImage } from '../model/site.model';

/**
 * Yapılandırmadan gelen adreslerin tek kapısı: bölüm alternatifleri bağlantıyı ve görseli yalnız VM'den okur, VM de buradan geçirir.
 * Angular'ın `[href]` temizliği ikinci savunmadır; burada şema baştan sınırlanır, reddedilen bağlantı hiç çizilmez.
 */
const LINK_SCHEMES: ReadonlySet<string> = new Set(['http:', 'https:', 'tel:', 'mailto:']);

/**
 * Adres değerinin ön denetimi. Görünmez biçim karakteri (Unicode Cf: U+FEFF, U+200B) varsa değer reddedilir: `trim` U+FEFF'i kırpar, böylece
 * başında U+FEFF olan "javascript:" göründüğünden farklı okunurdu. Backend de aynı değeri reddeder. Kırpma sonrası denetim karakteri de reddedilir.
 */
function cleanAddress(value: string | null | undefined): string | null {
    if (!value || /\p{Cf}/u.test(value)) return null;

    const text = value.trim();

    return text && !/\p{Cc}/u.test(text) ? text : null;
}

/** Yalnız tam adres: `http`, `https`, `tel`, `mailto`. Şema kırpılmış değer üzerinde, tarayıcının ayrıştırıcısıyla denetlenir. */
export function safeHref(value: string | null | undefined): string | null {
    const text = cleanAddress(value);

    if (!text) return null;

    try {
        const url = new URL(text);

        return LINK_SCHEMES.has(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

/** Görsel: tam adres, kök göreli yol (bizim sunucu) ya da yüklenen dosyanın önizlemesi (raster data URL, panelde yetkili uçtan alınan `blob:`). */
export function safeImageSrc(value: string | null | undefined): string | null {
    const text = cleanAddress(value);

    if (!text) return null;

    // Kök göreli yol başka sunucuya kaçamaz: tarayıcı "/\\" ile başlayanı da "//" sayar.
    if (/^\/(?![/\\])/.test(text) || /^data:image\/(png|jpe?g|webp|gif);/i.test(text) || /^blob:https?:\/\//i.test(text)) return text;

    const href = safeHref(text);

    return href?.startsWith('http') ? href : null;
}

export function safeImage(image: SiteImage | null): SiteImage | null {
    const src = safeImageSrc(image?.src);

    return image && src ? { src, alt: image.alt } : null;
}

export interface SocialVm {
    readonly key: string;
    readonly label: string;
    readonly href: string;
}

/** Tam adres de kullanıcı adı da girilebilir. Kullanıcı adı adrese yol parçası olarak gömülür, başka adrese kaçamaz. */
function profileHref(value: string, base: string): string | null {
    const text = cleanAddress(value);

    if (!text) return null;

    return /^[a-z][a-z0-9+.-]*:/i.test(text) ? safeHref(text) : safeHref(`${base}${encodeURIComponent(text.replace(/^@/, ''))}/`);
}

function websiteHref(value: string): string | null {
    const text = cleanAddress(value);

    if (!text) return null;

    return safeHref(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
}

export function socialLinks(clinic: SiteClinic): readonly SocialVm[] {
    const links: { key: string; label: string; href: string | null }[] = [
        { key: 'website', label: 'Web sitesi', href: websiteHref(clinic.website) },
        { key: 'instagram', label: 'Instagram', href: profileHref(clinic.instagram, 'https://www.instagram.com/') },
        { key: 'facebook', label: 'Facebook', href: profileHref(clinic.facebook, 'https://www.facebook.com/') }
    ];

    return links.filter((link): link is SocialVm => link.href !== null);
}
