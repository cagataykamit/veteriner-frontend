import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { SubscriptionBillingPeriod, SubscriptionCheckoutSessionVm, SubscriptionPlanVm, SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { defByPlanKey, planPriceView } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { subscriptionPlanLabel, subscriptionPlanLimitLabels } from '@/app/entities/subscription/utils/subscription-plan.utils';
import { isActiveTrialingSubscription, isExpiredReadOnlySubscription } from '@/app/features/subscriptions/utils/subscription-access.utils';
import { canChooseBillingPeriod, isSwitchToYearly, SUBSCRIPTION_BILLING_PERIOD_LABELS } from '@/app/features/subscriptions/utils/subscription-billing-period.utils';
import { hasOpenCheckoutForPlan, isCurrentPlan, isDowngradePlan, isUpgradePlan } from '@/app/features/subscriptions/utils/subscription-plan-change.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';

/** Abonelik sayfası plan kartı: ödeme dönemi seçimi, paket kartları ve paket eylemi. Eylemi sayfa yürütür. */
@Component({
    selector: 'app-subscription-plan-cards',
    standalone: true,
    imports: [FormsModule, ButtonModule, SelectButtonModule, AppEmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let s = summary();
        <div class="card mb-0">
            <h5 class="mt-0 mb-4">{{ canManage() ? 'Kullanılabilir planlar' : 'Plan bilgileri' }}</h5>
            @if (canManage()) {
                @if (canChooseBillingPeriod(s)) {
                    <div class="flex flex-wrap items-center gap-3 mb-4">
                        <p-selectbutton
                            [options]="billingPeriodOptions"
                            [ngModel]="billingPeriod()"
                            (ngModelChange)="billingPeriod.set($event)"
                            optionLabel="label"
                            optionValue="value"
                            [allowEmpty]="false"
                            ariaLabel="Ödeme dönemi"
                        />
                        <span class="text-sm text-muted-color">Yıllık ödemede 12 ay için 10 ay ücreti alınır (2 ay hediye). Aylıktan geçişte kalan günleriniz ücretten düşülür.</span>
                    </div>
                } @else if (s.billingPeriod === 'Yearly' && !isTrialingSubscription(s)) {
                    <p class="mt-0 mb-4 text-sm text-muted-color">Yıllık ödeme dönemindesiniz. Aylık ödemeye dönem bitince, yenilemede geçebilirsiniz.</p>
                }
            }
            @if (s.availablePlans.length === 0) {
                <app-empty-state message="Plan listesi bulunamadı." />
            } @else {
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    @for (plan of s.availablePlans; track plan.code) {
                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                                <div class="font-medium break-words">{{ planLabel(plan) }}</div>
                                @if (isCurrentPlan(plan, s)) {
                                    <span class="text-xs px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Mevcut</span>
                                }
                            </div>
                            @if (plan.description) {
                                <p class="mt-2 mb-0 text-sm text-color break-words">{{ plan.description }}</p>
                            }
                            @if (planPriceText(plan, s); as price) {
                                <p class="mt-2 mb-0 text-sm font-medium text-color">{{ price }}</p>
                            }
                            @if (planLimitLabels(plan.code); as limits) {
                                <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div class="rounded-lg bg-surface-100 dark:bg-surface-800 px-2.5 py-2">
                                        <div class="text-[10px] font-medium uppercase tracking-wide text-muted-color">Kullanıcı</div>
                                        <div class="text-xs font-semibold text-color">{{ limits.userLimitLabel }}</div>
                                    </div>
                                    <div class="rounded-lg bg-surface-100 dark:bg-surface-800 px-2.5 py-2">
                                        <div class="text-[10px] font-medium uppercase tracking-wide text-muted-color">Klinik</div>
                                        <div class="text-xs font-semibold text-color">{{ limits.clinicLimitLabel }}</div>
                                    </div>
                                </div>
                            }
                            @if (canManage() && shouldShowPlanAction(plan, s)) {
                                <div class="mt-3">
                                    <button pButton type="button" [disabled]="busy()" (click)="planAction.emit(plan)"><i class="p-button-icon" [class]="busyPlanCodes().includes(plan.code) ? 'pi pi-spin pi-spinner' : 'pi pi-arrow-right'"></i>{{ planActionLabel(plan, s) }}</button>
                                </div>
                            }
                        </div>
                    }
                </div>
            }
            @if (actionError()) {
                <p class="text-red-500 mt-3 mb-0 text-sm" role="alert">{{ actionError() }}</p>
            }
            @if (actionInfo()) {
                <p class="text-primary mt-3 mb-0 text-sm">{{ actionInfo() }}</p>
            }
        </div>
    `
})
export class SubscriptionPlanCardsComponent {
    readonly summary = input.required<SubscriptionSummaryVm>();
    /** Özet `canManageSubscription` + `Subscriptions.Manage` yetkisi. */
    readonly canManage = input(false);
    /** Kartlarda gösterilen ve ödemede kullanılan dönem (BILL-001). */
    readonly billingPeriod = model<SubscriptionBillingPeriod>('Monthly');
    readonly checkoutSession = input<SubscriptionCheckoutSessionVm | null>(null);
    /** Plan eylemi, ödeme veya doğrulama sürüyor: eylem düğmeleri kapalı. */
    readonly busy = input(false);
    /** Eylemi süren paket kodları (ödeme başlatma, dönem sonu düşürme); düğmede dönen simge. */
    readonly busyPlanCodes = input<readonly (string | null)[]>([]);
    readonly actionError = input<string | null>(null);
    readonly actionInfo = input<string | null>(null);

    readonly planAction = output<SubscriptionPlanVm>();

    readonly billingPeriodOptions: { readonly label: string; readonly value: SubscriptionBillingPeriod }[] = [
        { label: SUBSCRIPTION_BILLING_PERIOD_LABELS.Monthly, value: 'Monthly' },
        { label: `${SUBSCRIPTION_BILLING_PERIOD_LABELS.Yearly} · 2 ay hediye`, value: 'Yearly' }
    ];
    readonly canChooseBillingPeriod = canChooseBillingPeriod;
    readonly isTrialingSubscription = isActiveTrialingSubscription;
    readonly isCurrentPlan = isCurrentPlan;
    readonly planLimitLabels = subscriptionPlanLimitLabels;

    planLabel(plan: { code: string; name: string }): string {
        return subscriptionPlanLabel(plan.code, plan.name);
    }

    planActionLabel(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): string {
        if (!hasOpenCheckoutForPlan(plan, this.checkoutSession(), this.billingPeriod())) {
            if (isExpiredReadOnlySubscription(summary)) {
                return isCurrentPlan(plan, summary) ? 'Aboneliği yenile' : 'Bu paketle devam et';
            }

            if (isCurrentPlan(plan, summary) && isSwitchToYearly(summary, this.billingPeriod())) {
                return 'Yıllığa geç';
            }

            if (isDowngradePlan(plan, summary)) {
                return isActiveTrialingSubscription(summary) ? 'Deneme bitiminde bu pakete geç' : 'Dönem sonunda bu pakete geç';
            }

            if (isUpgradePlan(plan, summary)) {
                return 'Hemen yükselt';
            }

            return 'Bu paketi aktifleştir';
        }

        const url = this.checkoutSession()?.checkoutUrl?.trim();

        return url ? 'Ödemeye devam et' : 'Durumu yenile';
    }

    shouldShowPlanAction(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
        if (isExpiredReadOnlySubscription(summary)) {
            return true;
        }

        return !isCurrentPlan(plan, summary) || isSwitchToYearly(summary, this.billingPeriod());
    }

    /** Kartta seçilen dönemin liste fiyatı ("₺999 / ay", "₺9.990 / yıl"); fiyat verisi yoksa `null`. */
    planPriceText(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): string | null {
        const def = defByPlanKey(plan.code);
        const period = canChooseBillingPeriod(summary) ? this.billingPeriod() : summary.billingPeriod;
        const view = def ? planPriceView(def, period === 'Yearly' ? 'yearly' : 'monthly') : null;

        return view?.unit ? `${view.amount} ${view.unit}` : null;
    }
}
