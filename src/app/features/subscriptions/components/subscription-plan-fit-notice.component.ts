import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { SubscriptionPlanFitVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { PLAN_FIT_LINKS, planFitMessage, type PlanFitMode } from '@/app/features/subscriptions/utils/subscription-plan-fit.utils';

/**
 * Paket değişimi hedef pakete sığmadığında (ADR-035 2026-11-08, seçenek A) neyin fazla olduğunu ve ne yapılacağını düz Türkçe yazar;
 * fazlayı azaltacak sayfalara bağlantı verir. Hem anlık red (`Subscriptions.PlanLimitsExceeded`) hem dönem sonunda uygulanmayan
 * düşürme için kullanılır.
 */
@Component({
    selector: 'app-subscription-plan-fit-notice',
    standalone: true,
    imports: [RouterLink, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card mb-0 border-round bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60" role="alert" data-testid="plan-fit-notice">
            <h5 class="mt-0 mb-2">{{ title() }}</h5>
            <p class="m-0 text-sm text-color">{{ message().limits }} {{ message().usage }}</p>
            <p class="m-0 mt-2 text-sm text-color font-medium" data-testid="plan-fit-action">{{ message().action }}</p>
            <div class="flex flex-wrap gap-2 mt-3">
                @if (fit().excessClinicCount > 0) {
                    <a pButton type="button" class="p-button-secondary p-button-sm" [routerLink]="links.clinics" data-testid="plan-fit-clinics"><i class="pi pi-building"></i>Klinikler</a>
                }
                @if (fit().excessUserCount > 0) {
                    <a pButton type="button" class="p-button-secondary p-button-sm" [routerLink]="links.members" data-testid="plan-fit-members"><i class="pi pi-users"></i>Kullanıcılar</a>
                    @if (fit().pendingInviteCount > 0) {
                        <a pButton type="button" class="p-button-secondary p-button-sm" [routerLink]="links.invites" data-testid="plan-fit-invites"><i class="pi pi-envelope"></i>Bekleyen davetler</a>
                    }
                }
            </div>
        </div>
    `
})
export class SubscriptionPlanFitNoticeComponent {
    readonly fit = input.required<SubscriptionPlanFitVm>();
    readonly mode = input<PlanFitMode>('change');
    readonly title = input('Paket değiştirilemedi');

    readonly links = PLAN_FIT_LINKS;
    readonly message = computed(() => planFitMessage(this.fit(), this.mode()));
}
