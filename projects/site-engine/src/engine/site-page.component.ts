import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { SectionType, SiteDesign } from '../model/site.model';
import { findAlternative } from './section-registry';
import { SECTION_BASE } from './section-base';
import { SECTION_DIRECTIVES, SiteSection } from './site-context';
import { PAGE_HEAD_STYLES, PAGE_INFO_STYLES, PAGE_READING_STYLES } from './site-page.styles';
import { SiteHoursComponent, SiteMapComponent } from './site-parts.component';
import { pageHeading, type SitePage } from './site-page-route';

/**
 * Alt sayfalar. Liste sayfaları sitede seçili bölüm alternatifini çizer (hizmetler sayfası ana sayfadaki düzenle aynıdır); yalnız
 * sayfa başlığı ve yazı sayfaları burada, token'larla ortak yazılıdır. Başlığın duruşu seçili hero'dan gelir.
 *
 * Randevu sayfası kliniğin talep formuna (ADR-042, K11) bağlantı verir, telefon ve saatleri gösterir; motor ikinci bir randevu
 * modeli kurmaz. En yakın müsait saatler (TIER-017) aynı forma o saat seçili gider.
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
                    @if (v.nextSlotDays.length) {
                        <div class="slots" role="group" aria-label="En yakın müsait saatler">
                            <h2 class="h">En yakın müsait saatler</h2>
                            @for (day of v.nextSlotDays; track day.label) {
                                <div class="slot-day">
                                    <h3>{{ day.label }}</h3>
                                    <ul>
                                        @for (slot of day.slots; track slot.href) {
                                            <li><a class="slot" [href]="slot.href" [attr.aria-label]="slot.label">{{ slot.time }}</a></li>
                                        }
                                    </ul>
                                </div>
                            }
                            <p class="muted">Saati seçince talep formu bu saatle açılır. Bu bir talep; klinik onaylayınca randevunuz kesinleşir.</p>
                        </div>
                    }
                    @if (v.bookingHref) {
                        <a siteCta class="btn main">Randevu talebi gönder</a>
                    }
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

    protected readonly head = computed(() => pageHeading(this.page(), this.vm()));

    protected comp(type: SectionType) {
        return findAlternative(type, this.sections()[type]).component;
    }
}
