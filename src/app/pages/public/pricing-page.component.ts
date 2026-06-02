import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { PRICING_PLAN_DEFS } from '@/app/features/public/utils/pricing-plan.utils';
import { AppFloatingConfigurator } from '@/app/layout/component/app.floatingconfigurator';
import { PublicTopbarComponent } from '@/app/pages/public/components/public-topbar.component';
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
        <div class="min-h-screen overflow-x-hidden bg-surface-0 dark:bg-surface-950">
            <app-public-topbar />

            <main class="mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8">
                <header class="mx-auto mb-6 max-w-2xl text-center md:mb-8">
                    <h1 class="m-0 text-3xl font-bold leading-tight text-surface-900 dark:text-surface-0 md:text-4xl">Paketler</h1>
                    <p class="mt-3 text-base text-muted-color md:text-lg">Kliniğinizin büyüklüğüne göre uygun planı seçin.</p>
                </header>

                <div class="mt-8 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
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
                            <ul class="mb-4 flex-1 list-none space-y-1.5 p-0">
                                @for (feature of plan.features; track feature) {
                                    <li class="flex items-start gap-2 text-sm leading-5 text-surface-700 dark:text-surface-200">
                                        <i class="pi pi-check-circle pricing-feature-check mt-0.5 shrink-0 text-xs" aria-hidden="true"></i>
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
                                styleClass="w-full !font-semibold !py-2"
                                [outlined]="!plan.recommended"
                            ></a>
                        </article>
                    }
                </div>

            </main>
        </div>
        <app-floating-configurator />
    `,
    styles: `
        .pricing-plan-card {
            border-color: var(--p-content-border-color);
            transition:
                border-color 0.2s ease,
                box-shadow 0.2s ease,
                transform 0.2s ease;
        }

        .pricing-plan-card:hover {
            border-color: color-mix(in srgb, var(--primary-color) 35%, transparent);
            box-shadow: 0 12px 32px -12px color-mix(in srgb, var(--primary-color) 18%, transparent);
        }

        .pricing-plan-card--featured {
            border-color: color-mix(in srgb, var(--primary-color) 45%, transparent);
            box-shadow: 0 16px 40px -16px color-mix(in srgb, var(--primary-color) 28%, transparent);
        }

        .pricing-featured-badge {
            background: color-mix(in srgb, var(--primary-color) 12%, transparent);
            color: var(--primary-color);
        }

        .pricing-price-label {
            color: var(--primary-color);
        }

        .pricing-limit-icon {
            background: color-mix(in srgb, var(--primary-color) 12%, transparent);
            color: var(--primary-color);
        }

        .pricing-feature-check {
            color: var(--primary-color);
        }
    `
})
export class PricingPageComponent implements OnInit {
    readonly plans = PRICING_PLAN_DEFS;

    ngOnInit(): void {
        removeOrphanedPrimeMenuPopupsFromBody(document);
    }
}
