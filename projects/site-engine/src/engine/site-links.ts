import type { SiteClinic, SiteImage } from '../model/site.model';

/**
 * Yapılandırmadan gelen adreslerin tek kapısı: bölüm alternatifleri bağlantıyı ve görseli yalnız VM'den okur, VM de buradan geçirir.
 * Angular'ın `[href]` temizliği ikinci savunmadır; burada şema baştan sınırlanır, reddedilen bağlantı hiç çizilmez.
 */
const LINK_SCHEMES: ReadonlySet<string> = new Set(['http:', 'https:', 'tel:', 'mailto:']);

/** Yalnız tam adres: `http`, `https`, `tel`, `mailto`. Ayrıştırıcı `java\nscript:` gibi gizlemeleri de tarayıcı gibi çözer. */
export function safeHref(value: string | null | undefined): string | null {
    const text = value?.trim();

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
    const text = value?.trim();

    if (!text) return null;

    if (/^\/(?!\/)/.test(text) || /^data:image\/(png|jpe?g|webp|gif);/i.test(text) || /^blob:https?:\/\//i.test(text)) return text;

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
    return /^[a-z][a-z0-9+.-]*:/i.test(value) ? safeHref(value) : safeHref(`${base}${encodeURIComponent(value.replace(/^@/, ''))}/`);
}

function websiteHref(value: string): string | null {
    return safeHref(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
}

export function socialLinks(clinic: SiteClinic): readonly SocialVm[] {
    const links: { key: string; label: string; href: string | null }[] = [
        { key: 'website', label: 'Web sitesi', href: clinic.website.trim() ? websiteHref(clinic.website.trim()) : null },
        { key: 'instagram', label: 'Instagram', href: clinic.instagram.trim() ? profileHref(clinic.instagram.trim(), 'https://www.instagram.com/') : null },
        { key: 'facebook', label: 'Facebook', href: clinic.facebook.trim() ? profileHref(clinic.facebook.trim(), 'https://www.facebook.com/') : null }
    ];

    return links.filter((link): link is SocialVm => link.href !== null);
}
