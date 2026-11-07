import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PageKey, SectionType, SiteDesign } from '../model/site.model';
import { findAlternative } from './section-registry';
import { SECTION_BASE } from './section-base';
import { SECTION_DIRECTIVES, SiteSection } from './site-context';
import { PAGE_HEAD_STYLES, PAGE_INFO_STYLES, PAGE_READING_STYLES } from './site-page.styles';
import { SiteHoursComponent, SiteMapComponent } from './site-parts.component';
import type { ArticleVm, ServiceVm, SiteVm } from './site-vm';

export type SitePage =
    | { readonly kind: 'home' }
    | { readonly kind: 'notfound' }
    | { readonly kind: 'hakkimizda' | 'hizmetler' | 'hekimler' | 'ekibimiz' | 'rehber' | 'galeri' | 'iletisim' | 'randevu' | 'acil' | 'sss' | 'subeler' }
    | { readonly kind: 'hizmet'; readonly service: ServiceVm }
    | { readonly kind: 'yazi'; readonly article: ArticleVm };

const ROUTES: Readonly<Record<string, Extract<PageKey, SitePage['kind']> | 'rehber'>> = {
    hakkimizda: 'hakkimizda',
    hizmetler: 'hizmetler',
    hekimler: 'hekimler',
    ekibimiz: 'ekibimiz',
    'saglik-rehberi': 'rehber',
    galeri: 'galeri',
    iletisim: 'iletisim',
    randevu: 'randevu',
    acil: 'acil',
    sss: 'sss',
    subelerimiz: 'subeler'
};

/** Yolu sayfaya çevirir. Kapatılmış, boş ya da olmayan sayfa "bulunamadı" olur; site boş açılmaz. */
export function resolveSitePage(path: string, vm: SiteVm): SitePage {
    const [first, second] = path.split('#')[0].split('/').filter(Boolean);

    if (!first) return { kind: 'home' };

    const kind = Object.hasOwn(ROUTES, first) ? ROUTES[first] : undefined;

    if (!kind || !vm.pages[kind]) return { kind: 'notfound' };

    if (second && kind === 'hizmetler') {
        const service = vm.services.find((item) => item.slug === second);

        return service && vm.pages.hizmetDetay ? { kind: 'hizmet', service } : { kind: 'notfound' };
    }

    if (second && kind === 'rehber') {
        const article = vm.articles.find((item) => item.slug === second);

        return article ? { kind: 'yazi', article } : { kind: 'notfound' };
    }

    return second ? { kind: 'notfound' } : ({ kind } as SitePage);
}

/**
 * Alt sayfalar. Liste sayfaları sitede seçili bölüm alternatifini çizer (hizmetler sayfası ana sayfadaki düzenle aynıdır); yalnız
 * sayfa başlığı ve yazı sayfaları burada, token'larla ortak yazılıdır. Başlığın duruşu seçili hero'dan gelir.
 *
 * Randevu sayfası şimdilik telefona ve saatlere yönlendirir: talep formu ADR-042 akışına bağlanır (K11), motor ikinci bir randevu
 * modeli kurmaz.
 */
@Component({
    selector: 'site-page',
    standalone: true,
    imports: [NgComponentOutlet, SECTION_DIRECTIVES, SiteHoursComponent, SiteMapComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        @let p = page();
        @if (head(); as h) {
            <header class="page-head" [attr.data-style]="sections().hero">
                <div class="inner">
                    @if (h.back; as back) {
                        <a class="back" [siteLink]="back.path"><i class="pi pi-arrow-left" aria-hidden="true"></i>{{ back.label }}</a>
                    }
                    <h1 class="h ttl">{{ h.title }}</h1>
                    @if (h.lead) {
                        <p class="ld">{{ h.lead }}</p>
                    }
                </div>
            </header>
        }

        @switch (p.kind) {
            @case ('hakkimizda') {
                <div data-place="page"><ng-container *ngComponentOutlet="comp('about')" /></div>
                @if (v.features.length) {
                    <ng-container *ngComponentOutlet="comp('features')" />
                }
            }
            @case ('hizmetler') {
                <div data-place="page"><ng-container *ngComponentOutlet="comp('services')" /></div>
            }
            @case ('hekimler') {
                <div data-place="page"><ng-container *ngComponentOutlet="comp('team')" /></div>
                <section class="inner bios">
                    @for (member of v.doctors; track member.slug) {
                        <article>
                            <h2 class="h">{{ member.name }}</h2>
                            <p class="muted">{{ member.title }}</p>
                            <p>{{ member.bio }}</p>
                        </article>
                    }
                </section>
            }
            @case ('ekibimiz') {
                <div data-place="page"><ng-container *ngComponentOutlet="comp('team')" /></div>
            }
            @case ('rehber') {
                <div data-place="page"><ng-container *ngComponentOutlet="comp('guide')" /></div>
            }
            @case ('galeri') {
                <div data-place="page"><ng-container *ngComponentOutlet="comp('gallery')" /></div>
            }
            @case ('iletisim') {
                <div data-place="page"><ng-container *ngComponentOutlet="comp('contact')" /></div>
            }
            @case ('hizmet') {
                <section class="inner detail">
                    <div class="prose">
                        @for (paragraph of service()!.paragraphs; track $index) {
                            <p>{{ paragraph }}</p>
                        }
                        @if (v.cta; as cta) {
                            <a siteCta class="btn main">{{ cta.label }}</a>
                        }
                    </div>
                    @if (service()!.image; as image) {
                        <figure><img [siteImg]="image" eager /></figure>
                    }
                </section>
                @if (otherServices().length) {
                    <section class="inner others">
                        <h2 class="h">Diğer hizmetler</h2>
                        <ul>
                            @for (other of otherServices(); track other.slug) {
                                <li><a [siteLink]="other.path">{{ other.title }}<i class="pi pi-arrow-right" aria-hidden="true"></i></a></li>
                            }
                        </ul>
                    </section>
                }
            }
            @case ('yazi') {
                <article class="inner reading">
                    @if (article()!.image; as image) {
                        <figure><img [siteImg]="image" eager /></figure>
                    }
                    @for (paragraph of article()!.paragraphs; track $index) {
                        <p>{{ paragraph }}</p>
                    }
                </article>
            }
            @case ('sss') {
                <section class="inner faq">
                    @for (faq of v.faqs; track $index) {
                        <details>
                            <summary class="h">{{ faq.question }}<i class="pi pi-plus" aria-hidden="true"></i></summary>
                            <p>{{ faq.answer }}</p>
                        </details>
                    }
                </section>
            }
            @case ('acil') {
                <section class="inner callout">
                    <p class="note">{{ v.emergencyText }}</p>
                    @if (v.telHref) {
                        <a class="h call" [href]="v.telHref"><i class="pi pi-phone" aria-hidden="true"></i>{{ v.phone }}</a>
                    }
                    <p class="muted">Acil durumda kliniği arayın.</p>
                    <site-hours />
                </section>
            }
            @case ('subeler') {
                <section class="inner branches">
                    @for (branch of v.branches; track branch.name) {
                        <article>
                            <h2 class="h">{{ branch.name }}</h2>
                            <address>{{ branch.address }}</address>
                            <p class="muted">{{ branch.phone }}</p>
                        </article>
                    }
                    <site-map />
                </section>
            }
            @case ('randevu') {
                <section class="inner callout">
                    @if (v.telHref) {
                        <a class="h call" [href]="v.telHref"><i class="pi pi-phone" aria-hidden="true"></i>{{ v.phone }}</a>
                    }
                    <site-hours />
                </section>
            }
            @case ('notfound') {
                <section class="inner lost">
                    <h1 class="h">Bu sayfa kapalı ya da yok.</h1>
                    <a class="btn main" siteLink="/">Ana sayfaya dön</a>
                </section>
            }
        }
    `,
    styles: [SECTION_BASE, PAGE_HEAD_STYLES, PAGE_READING_STYLES, PAGE_INFO_STYLES]
})
export class SitePageComponent extends SiteSection {
    readonly page = input.required<SitePage>();
    readonly sections = input.required<SiteDesign['sections']>();

    protected readonly service = computed(() => {
        const page = this.page();

        return page.kind === 'hizmet' ? page.service : null;
    });
    protected readonly article = computed(() => {
        const page = this.page();

        return page.kind === 'yazi' ? page.article : null;
    });
    protected readonly otherServices = computed(() =>
        this.vm()
            .services.filter((item) => item.slug !== this.service()?.slug)
            .slice(0, 5)
    );

    protected readonly head = computed<{ title: string; lead: string; back: { label: string; path: string } | null } | null>(() => {
        const page = this.page();
        const v = this.vm();

        switch (page.kind) {
            case 'hakkimizda':
                return { title: 'Hakkımızda', lead: v.intro, back: null };
            case 'hizmetler':
                return { title: v.copy.servicesTitle, lead: v.copy.servicesIntro, back: null };
            case 'hekimler':
                return { title: v.copy.teamTitle, lead: v.copy.teamIntro, back: null };
            case 'ekibimiz':
                return { title: 'Ekibimiz', lead: 'Hekimler ve onlarla çalışan ekip.', back: null };
            case 'rehber':
                return { title: v.copy.guideTitle, lead: 'Genel bilgilendirme yazılarıdır; hayvanınız için hekiminize danışın.', back: null };
            case 'galeri':
                return { title: v.copy.galleryTitle, lead: '', back: null };
            case 'iletisim':
                return { title: v.copy.contactTitle, lead: v.copy.contactText, back: null };
            case 'randevu':
                return { title: v.copy.ctaPrimary, lead: v.telHref ? 'Uygun gün ve saati telefonda birlikte belirleyelim.' : '', back: null };
            case 'acil':
                return { title: 'Acil durumda', lead: '', back: null };
            case 'sss':
                return { title: 'Sıkça sorulan sorular', lead: '', back: null };
            case 'subeler':
                return { title: 'Şubelerimiz', lead: '', back: null };
            case 'hizmet':
                return { title: page.service.title, lead: page.service.summary, back: v.pages.hizmetler ? { label: 'Hizmetler', path: '/hizmetler' } : null };
            case 'yazi':
                return { title: page.article.title, lead: page.article.summary, back: v.pages.rehber ? { label: v.copy.guideTitle, path: '/saglik-rehberi' } : null };
            default:
                return null;
        }
    });

    protected comp(type: SectionType) {
        return findAlternative(type, this.sections()[type]).component;
    }
}
