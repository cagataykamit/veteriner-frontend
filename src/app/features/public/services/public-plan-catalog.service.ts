import { inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { PricingCatalogState } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { mapPublicPlanCatalogDto } from '@/app/features/public/data/public-plan-catalog.mapper';
import type { PublicSubscriptionPlanCatalogDto } from '@/app/features/public/models/public-plan-catalog-api.model';

/**
 * Tanıtım sitesi paket kataloğu (WEB-007): fiyat ve kullanıcı sınırı backend'den, oturum boyunca bir kez alınır. Alınamazsa
 * durum `error` olur ve sayfa eski ya da sabit sayı yazmaz; sonraki sayfa açılışı yeniden dener.
 */
@Injectable({ providedIn: 'root' })
export class PublicPlanCatalogService {
    private readonly api = inject(ApiClient);
    private readonly stateSignal = signal<PricingCatalogState>({ status: 'loading' });
    private requested = false;

    readonly state = this.stateSignal.asReadonly();

    ensureLoaded(): void {
        if (this.requested && this.stateSignal().status !== 'error') {
            return;
        }

        this.requested = true;
        this.stateSignal.set({ status: 'loading' });
        this.api.get<PublicSubscriptionPlanCatalogDto>(ApiEndpoints.public.subscriptionPlans()).subscribe({
            next: (dto) => {
                const catalog = mapPublicPlanCatalogDto(dto);

                this.stateSignal.set(catalog ? { status: 'ready', catalog } : { status: 'error' });
            },
            error: () => this.stateSignal.set({ status: 'error' })
        });
    }
}
