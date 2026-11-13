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
import { PublicScreenshotComponent } from './public-screenshot.component';

/**
 * Klinik web sitesi vitrini: açık teal yüzeyde kendi başına bir bölüm. Dört tasarım, yayınlanmış örnek sitenin ilk ekranıdır.
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
        <div class="public-site-showcase">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p class="public-eyebrow m-0">{{ content.eyebrow }}</p>
                <p class="m-0 text-sm font-semibold text-[var(--public-accent-text)]" data-site-showcase-plans>{{ plans }}</p>
            </div>
            <h2 [id]="headingId()" class="public-h2 m-0 mt-3">{{ compact() ? content.homeTitle : content.title }}</h2>
            <p class="public-lead m-0 mt-3 max-w-2xl">{{ compact() ? content.homeLead : content.lead }}</p>

            @if (!compact()) {
                <h3 class="m-0 mt-10 text-lg font-semibold text-surface-900 dark:text-surface-0">{{ content.designsTitle }}</h3>
                <p class="m-0 mt-1.5 max-w-2xl text-sm text-surface-600 dark:text-surface-300">{{ content.designsNote }}</p>
            }

            <ul class="m-0 mt-6 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2" [class.lg:grid-cols-4]="compact()" data-site-designs>
                @for (design of designs; track design.key) {
                    <li>
                        <figure class="public-shot public-site-design m-0">
                            <div class="public-site-design-address" aria-hidden="true"><i class="pi pi-globe"></i>{{ content.address }}</div>
                            <img
                                class="block h-auto w-full"
                                [src]="srcOf(design)"
                                [alt]="design.alt"
                                [attr.width]="size.width"
                                [attr.height]="size.height"
                                loading="lazy"
                                decoding="async"
                            />
                            <figcaption class="public-shot-caption">
                                <strong class="block font-semibold text-surface-900 dark:text-surface-0">{{ design.name }}</strong>
                                @if (!compact()) {
                                    <span class="block">{{ design.note }}</span>
                                }
                            </figcaption>
                        </figure>
                    </li>
                }
            </ul>

            @if (compact()) {
                <p class="m-0 mt-5">
                    <a [routerLink]="featuresPath" [fragment]="content.id" class="public-brand-link inline-flex min-h-[44px] items-center">{{ content.homeLinkLabel }}</a>
                </p>
            } @else {
                <h3 class="m-0 mt-12 text-lg font-semibold text-surface-900 dark:text-surface-0">{{ content.stepsTitle }}</h3>
                <ol class="public-site-steps m-0 mt-5 list-none p-0" data-site-steps>
                    @for (step of steps; track step.label; let i = $index) {
                        <li class="public-card p-4">
                            <span class="flex items-center gap-2.5">
                                <span class="public-timeline-marker shrink-0" aria-hidden="true">{{ i + 1 }}</span>
                                <strong class="text-base font-semibold text-surface-900 dark:text-surface-0">{{ step.label }}</strong>
                            </span>
                            <span class="mt-2 block text-sm text-surface-600 dark:text-surface-300">{{ step.text }}</span>
                        </li>
                    }
                </ol>

                <div class="mt-8">
                    <app-public-screenshot shot="klinikSitesi" [caption]="content.wizardCaption" />
                </div>

                <ul class="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3" data-site-links>
                    @for (link of links; track link.title) {
                        <li class="public-card flex flex-col p-5">
                            <span class="public-step-badge" aria-hidden="true"><i [class]="link.icon"></i></span>
                            <h3 class="m-0 mt-3 text-base font-semibold text-surface-900 dark:text-surface-0">{{ link.title }}</h3>
                            <p class="m-0 mt-1.5 flex-1 text-sm text-surface-600 dark:text-surface-300">{{ link.text }}</p>
                            @if (link.plans) {
                                <p class="m-0 mt-4 text-sm font-semibold text-[var(--public-accent-text)]">{{ link.plans }}</p>
                            }
                            @if (link.href) {
                                <p class="m-0 mt-3">
                                    <a [href]="link.href" class="public-brand-link inline-flex min-h-[44px] items-center text-sm">{{ link.hrefLabel }}</a>
                                </p>
                            }
                        </li>
                    }
                </ul>

                <p class="m-0 mt-6 text-sm text-surface-600 dark:text-surface-300" data-site-address-note>{{ content.addressNote }}</p>
            }
        </div>
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
}
