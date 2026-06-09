import { DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { PRICING_PLAN_DEFS } from '@/app/features/public/utils/pricing-plan.utils';
import { AppFloatingConfigurator } from '@/app/layout/component/app.floatingconfigurator';
import { PublicTopbarComponent } from '@/app/pages/public/components/public-topbar.component';
import { PUBLIC_PRICING_PAGE_META, setPublicPageMeta } from '@/app/features/public/utils/public-seo.utils';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';

@Component({
    selector: 'app-pricing-page',
    standalone: true,
    imports: [
        RouterLink,
        ButtonModule,
        RippleModule,
        AppFloatingConfigurator,
        PublicTopbarComponent
    ],
    template: `
        <div class="public-page min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
            <app-public-topbar />

            <main class="mx-auto max-w-6xl px-4 pb-10 pt-2 md:px-6 md:pb-14 md:pt-3">
                <header class="pricing-header mx-auto mb-6 max-w-2xl rounded-3xl px-4 pb-6 pt-5 text-center md:mb-8 md:pb-8 md:pt-6">
                    <h1 class="m-0 text-3xl font-bold leading-tight text-surface-900 dark:text-surface-0 md:text-4xl">Paketler</h1>
                    <p class="mt-3 text-base text-muted-color md:text-lg">Kliniğinizin büyüklüğüne göre uygun planı seçin.</p>
                </header>

                <div class="mt-6 grid grid-cols-1 gap-5 md:mt-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                    @for (plan of plans; track plan.slug) {
                        <article
                            class="pricing-plan-card relative flex flex-col rounded-3xl border bg-surface-0 p-4 pt-7 md:p-5 md:pt-8 dark:bg-surface-900"
                            [class.pricing-plan-card--featured]="plan.recommended"
                        >
                            <!-- Badge: absolute, içerik akışını bozmaz -->
                            @if (plan.recommended) {
                                <span
                                    class="pricing-featured-badge absolute left-5 top-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold md:left-6"
                                    >En popüler</span
                                >
                            }

                            <!-- Başlık + açıklama — tüm kartlarda aynı hizadan başlar -->
                            <div class="mb-2">
                                <h2 class="m-0 mb-1.5 text-base font-bold text-surface-900 dark:text-surface-0 md:text-lg">
                                    {{ plan.title }}
                                </h2>
                                <p class="m-0 text-sm leading-5 text-muted-color">{{ plan.description }}</p>
                            </div>

                            <!-- Fiyat alanı — priceLabel ayrı, trialLabel ayrı -->
                            <div class="mb-3 border-b border-surface-200 pb-3 dark:border-surface-700">
                                <div class="flex items-baseline gap-1.5">
                                    <span class="pricing-price-label text-xl font-bold md:text-2xl">
                                        {{ plan.priceLabel }}
                                    </span>
                                    @if (plan.billingPeriodLabel) {
                                        <span class="text-sm text-muted-color">{{ plan.billingPeriodLabel }}</span>
                                    }
                                </div>
                                <p class="m-0 mt-0.5 text-xs text-muted-color">{{ plan.trialLabel }}</p>
                            </div>

                            <!-- Limit kutuları -->
                            <div class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div
                                    class="flex items-center gap-2.5 rounded-xl border border-surface-200 bg-surface-50 px-2.5 py-2 dark:border-surface-700 dark:bg-surface-950"
                                >
                                    <span
                                        class="pricing-limit-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                                        aria-hidden="true"
                                    >
                                        <i class="pi pi-users text-xs"></i>
                                    </span>
                                    <div>
                                        <div class="text-[10px] font-medium uppercase tracking-wide text-muted-color">Kullanıcı</div>
                                        <div class="text-xs font-semibold text-surface-900 dark:text-surface-0">{{ plan.userLimitLabel }}</div>
                                    </div>
                                </div>
                                <div
                                    class="flex items-center gap-2.5 rounded-xl border border-surface-200 bg-surface-50 px-2.5 py-2 dark:border-surface-700 dark:bg-surface-950"
                                >
                                    <span
                                        class="pricing-limit-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                                        aria-hidden="true"
                                    >
                                        <i class="pi pi-building text-xs"></i>
                                    </span>
                                    <div>
                                        <div class="text-[10px] font-medium uppercase tracking-wide text-muted-color">Klinik</div>
                                        <div class="text-xs font-semibold text-surface-900 dark:text-surface-0">{{ plan.clinicLimitLabel }}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Özellik listesi — flex-1 ile altta CTA'ya yer açar -->
                            <ul class="mb-5 flex-1 list-none space-y-2 p-0">
                                @for (feature of plan.features; track feature) {
                                    <li class="flex items-start gap-2.5 text-sm leading-5 text-surface-700 dark:text-surface-200">
                                        <i class="pi pi-check-circle pricing-feature-check mt-[3px] shrink-0 text-sm" aria-hidden="true"></i>
                                        <span>{{ feature }}</span>
                                    </li>
                                }
                            </ul>

                            <!-- CTA — tüm kartlarda aynı metin -->
                            <a
                                [routerLink]="['/auth/signup']"
                                [queryParams]="{ plan: plan.slug }"
                                pButton
                                pRipple
                                label="Paketi seç"
                                [class.public-pricing-cta]="plan.recommended"
                                [class.public-pricing-cta-outlined]="!plan.recommended"
                                class="w-full !font-semibold !py-2"
                            ></a>
                        </article>
                    }
                </div>

            </main>
        </div>
        <app-floating-configurator [showPalette]="false" />
    `
})
export class PricingPageComponent implements OnInit {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly document = inject(DOCUMENT);

    readonly plans = PRICING_PLAN_DEFS;

    ngOnInit(): void {
        setPublicPageMeta(this.title, this.meta, PUBLIC_PRICING_PAGE_META, this.document);
        removeOrphanedPrimeMenuPopupsFromBody(this.document);
    }
}
