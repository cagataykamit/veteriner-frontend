import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { PRICING_PLAN_DEFS } from '@/app/features/public/utils/pricing-plan.utils';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { removeOrphanedPrimeMenuPopupsFromBody } from '@/app/shared/utils/prime-menu-overlay.utils';

@Component({
    selector: 'app-pricing-page',
    standalone: true,
    imports: [RouterModule, ButtonModule, RippleModule, AppFloatingConfigurator],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 min-h-screen min-w-screen py-10 px-4">
            <div class="max-w-6xl mx-auto">
                <div class="text-center mb-10">
                    <h1 class="text-surface-900 dark:text-surface-0 text-3xl font-medium m-0 mb-2">Paketler</h1>
                    <p class="text-muted-color m-0">14 günlük ücretsiz deneme ile başlayın; ödeme bu fazda alınmaz.</p>
                    <p class="mt-4 mb-0">
                        <a routerLink="/auth/login" class="text-primary font-medium no-underline text-sm">Zaten hesabınız var mı? Giriş yapın</a>
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    @for (plan of plans; track plan.slug) {
                        <div
                            class="card mb-0 h-full flex flex-col border border-surface-200 dark:border-surface-700 shadow-none"
                        >
                            <h2 class="mt-0 mb-2 text-surface-900 dark:text-surface-0 text-xl font-semibold">{{ plan.title }}</h2>
                            <p class="text-muted-color text-sm flex-1 m-0 mb-6">{{ plan.description }}</p>
                            <p-button
                                label="Ücretsiz denemeyi başlat"
                                styleClass="w-full"
                                [routerLink]="['/auth/signup']"
                                [queryParams]="{ plan: plan.slug }"
                            />
                        </div>
                    }
                </div>
            </div>
        </div>
    `
})
export class PricingPageComponent implements OnInit {
    readonly plans = PRICING_PLAN_DEFS;

    ngOnInit(): void {
        removeOrphanedPrimeMenuPopupsFromBody(document);
    }
}
