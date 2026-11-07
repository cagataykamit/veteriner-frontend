import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { siteJsonLd, sitePageHead, siteRootUrl, type SiteConfig } from '@site-engine';

const LINK_CANONICAL = 'site-canonical';
const LINK_ICON = 'site-icon';
const SCRIPT_JSON_LD = 'site-json-ld';
/** Simge yoksa tarayıcı kök adresten favicon istemesin. */
const EMPTY_ICON = 'data:,';

/** Baş etiketleri: sunucu çıktısında durur, botlar JS çalıştırmadan okur. Site içi gezintide tarayıcıda güncellenir. */
@Injectable({ providedIn: 'root' })
export class SiteHead {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    /** Yayındaki sayfa. Bulunamayan alt sayfa dizine girmez. */
    applyPublished(config: SiteConfig, path: string, origin: string): boolean {
        const head = sitePageHead(config, path);
        const pathname = path.split('#')[0];
        const url = `${siteRootUrl(origin, config.seo.slug)}${pathname === '/' ? '' : pathname}`;
        const image = head.imageSrc ? this.absolute(head.imageSrc, origin) : null;

        this.title.setTitle(head.title);
        this.setName('description', head.description);
        this.setName('robots', head.found ? 'index, follow' : 'noindex');
        this.setName('twitter:card', image ? 'summary_large_image' : 'summary');
        this.setProperty('og:type', 'website');
        this.setProperty('og:locale', 'tr_TR');
        this.setProperty('og:site_name', config.publish.siteName.trim() || config.content.clinic.name);
        this.setProperty('og:title', head.title);
        this.setProperty('og:description', head.description);
        this.setProperty('og:url', url);
        this.setProperty('og:image', image);
        this.setLink(LINK_CANONICAL, 'canonical', url);
        this.setLink(LINK_ICON, 'icon', head.iconSrc ?? EMPTY_ICON);
        this.setJsonLd(siteJsonLd(config, origin));

        return head.found;
    }

    /** Kapalı, yok ya da açılamayan site: başlık yazılır, dizine girmez. */
    applyNotice(title: string): void {
        this.title.setTitle(title);
        this.setName('robots', 'noindex');
    }

    /** Paylaşımda tam adres gerekir: kök göreli yol kökten, hazır fotoğraf gibi göreli yol sitenin tabanından çözülür. */
    private absolute(src: string, origin: string): string {
        return new URL(src, `${origin}/k/`).href;
    }

    private setName(name: string, content: string): void {
        if (content) this.meta.updateTag({ name, content });
        else this.meta.removeTag(`name="${name}"`);
    }

    private setProperty(property: string, content: string | null): void {
        if (content) this.meta.updateTag({ property, content });
        else this.meta.removeTag(`property="${property}"`);
    }

    private setLink(id: string, rel: string, href: string | null): void {
        const existing = this.document.getElementById(id) as HTMLLinkElement | null;

        if (!href) {
            existing?.remove();

            return;
        }

        const link = existing ?? this.document.createElement('link');

        link.id = id;
        link.rel = rel;
        link.href = href;

        if (!existing) this.document.head.appendChild(link);
    }

    private setJsonLd(json: string): void {
        const existing = this.document.getElementById(SCRIPT_JSON_LD);
        const script = existing ?? this.document.createElement('script');

        script.id = SCRIPT_JSON_LD;
        script.setAttribute('type', 'application/ld+json');
        script.textContent = json;

        if (!existing) this.document.head.appendChild(script);
    }
}
