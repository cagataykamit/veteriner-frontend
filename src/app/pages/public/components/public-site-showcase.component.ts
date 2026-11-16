import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PUBLIC_PATHS } from '@/app/features/public/utils/public-navigation.utils';
import {
    PUBLIC_SITE_DESIGN_SIZE,
    PUBLIC_SITE_DESIGNS,
    PUBLIC_SITE_LINKS,
    PUBLIC_SITE_SHOWCASE,
    PUBLIC_SITE_STEPS,
    publicSiteDesignSrc,
    publicSiteShowcasePlans
} from '@/app/features/public/utils/public-site-showcase-content.utils';
import { publicSiteToneClass } from '@/app/features/public/utils/public-site-tone.utils';
import { PublicScreenshotComponent } from './public-screenshot.component';

/**
 * Klinik web sitesi vitrini. Dört tasarım, yayınlanmış örnek sitenin ilk ekranıdır; fotoğraf kartı gibi beyaz çerçevede.
 * Görselin üstündeki ince şerit sitenin adres kalıbını yazar: panel ekranı değil web sitesi olduğu buradan anlaşılır; tarayıcı
 * düğmeleri taklit edilmez (tasarım belgesi bölüm 2). Tam hali Özellikler sayfasında: tasarımlar, sihirbaz adımları, sihirbaz ekranı
 * ve sitenin randevu, Veteriner bul ve klinik kaydıyla bağı. `compact` ana sayfadaki kısa halidir: başlık, dört tasarım ve
 * Özellikler'e bağlantı.
 */
@Component({
    selector: 'app-public-site-showcase',
    standalone: true,
    imports: [RouterLink, PublicScreenshotComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (compact()) {
            <header class="ps-head ps-head--center">
                <h2 [id]="headingId()" class="public-h2">{{ content.homeTitle }}</h2>
                <p class="public-lead">{{ content.homeLead }}</p>
            </header>
            <ul class="ps-list ps-photos ps-photos--tilt" data-site-designs>
                @for (design of designs; track design.key) {
                    <li>
                        <figure>
                            <img [src]="srcOf(design)" [alt]="design.alt" [attr.width]="size.width" [attr.height]="size.height" loading="lazy" decoding="async" />
                            <figcaption>{{ design.name }}</figcaption>
                        </figure>
                    </li>
                }
            </ul>
            <p class="ps-more ps-center">
                <a [routerLink]="featuresPath" [fragment]="content.id" class="public-btn public-btn-secondary">{{ content.homeLinkLabel }}<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
            </p>
        } @else {
            <div class="ps-feature">
                <header class="ps-feature-head">
                    <span class="ps-bubble ps-bubble--big" aria-hidden="true"><i class="pi pi-globe"></i></span>
                    <div>
                        <p class="ps-tagline">
                            <span class="ps-chip">{{ content.eyebrow }}</span><span class="ps-plan" data-site-showcase-plans>{{ plans }}</span>
                        </p>
                        <h2 [id]="headingId()" class="public-h2">{{ content.title }}</h2>
                        <p class="public-lead">{{ content.lead }}</p>
                    </div>
                </header>

                <div>
                    <h3 class="ps-h3">{{ content.designsTitle }}</h3>
                    <p class="ps-small">{{ content.designsNote }}</p>
                </div>
                <ul class="ps-list ps-photos ps-photos--large" data-site-designs>
                    @for (design of designs; track design.key) {
                        <li>
                            <figure>
                                <!-- Sitenin adres kalıbı: bunun panel ekranı değil web sitesi olduğunu söyler; tarayıcı düğmesi taklidi yok -->
                                <span class="ps-address" aria-hidden="true"><i class="pi pi-globe"></i>{{ content.address }}</span>
                                <img [src]="srcOf(design)" [alt]="design.alt" [attr.width]="size.width" [attr.height]="size.height" loading="lazy" decoding="async" />
                                <figcaption>
                                    {{ design.name }}<small>{{ design.note }}</small>
                                </figcaption>
                            </figure>
                        </li>
                    }
                </ul>

                <h3 class="ps-h3">{{ content.stepsTitle }}</h3>
                <ol class="ps-list ps-wizard" data-site-steps>
                    @for (step of steps; track step.label; let i = $index) {
                        <li [class]="toneOf(i)">
                            <span class="ps-bubble" aria-hidden="true">{{ i + 1 }}</span>
                            <strong>{{ step.label }}</strong>
                            <p>{{ step.text }}</p>
                        </li>
                    }
                </ol>

                <app-public-screenshot shot="klinikSitesi" [caption]="content.wizardCaption" />

                <ul class="ps-list ps-cards3" data-site-links>
                    @for (link of links; track link.title; let i = $index) {
                        <li [class]="'ps-card ' + toneOf(i)">
                            <span class="ps-round" aria-hidden="true"><i [class]="link.icon"></i></span>
                            <h3 class="ps-h3">{{ link.title }}</h3>
                            <p>{{ link.text }}</p>
                            @if (link.plans) {
                                <p class="ps-plan">{{ link.plans }}</p>
                            }
                            @if (link.href) {
                                <a [href]="link.href" class="ps-link">{{ link.hrefLabel }}<i class="pi pi-arrow-right" aria-hidden="true"></i></a>
                            }
                        </li>
                    }
                </ul>

                <p class="ps-note" data-site-address-note>{{ content.addressNote }}</p>
            </div>
        }
    `
})
export class PublicSiteShowcaseComponent {
    /** Ana sayfadaki kısa hali. */
    readonly compact = input<boolean>(false);
    /** Kapsayan `section`ın `aria-labelledby` değeri. */
    readonly headingId = input.required<string>();

    readonly content = PUBLIC_SITE_SHOWCASE;
    readonly plans = publicSiteShowcasePlans();
    readonly designs = PUBLIC_SITE_DESIGNS;
    readonly size = PUBLIC_SITE_DESIGN_SIZE;
    readonly steps = PUBLIC_SITE_STEPS;
    readonly links = PUBLIC_SITE_LINKS;
    readonly featuresPath = PUBLIC_PATHS.features;
    readonly srcOf = publicSiteDesignSrc;
    readonly toneOf = publicSiteToneClass;
}
