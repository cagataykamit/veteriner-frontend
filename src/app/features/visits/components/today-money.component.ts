import { Component, computed, input } from '@angular/core';
import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import { visitPaymentStatus } from '@/app/features/visits/utils/visit-status.utils';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Bugün satırı: ziyaretin ücret / ödenen / kalan tutarı ve müşterinin toplam borcu. Tutarlar yoksa (yetkisiz) hiçbir şey göstermez. */
@Component({
    selector: 'app-today-money',
    standalone: true,
    imports: [AppStatusTagComponent],
    template: `
        @if (status(); as s) {
            <app-status-tag [label]="s.label" [severity]="s.severity" />
        }
        @if ((item().chargedAmount ?? 0) > 0) {
            <div class="text-sm text-muted-color mt-1 whitespace-normal">
                <div>Ücret {{ money(item().chargedAmount) }}</div>
                <div>Ödenen {{ money(item().allocatedAmount) }}</div>
                <div [class.font-medium]="(item().outstandingAmount ?? 0) > 0">Kalan {{ money(item().outstandingAmount) }}</div>
            </div>
        }
        @if ((item().clientOutstandingAmount ?? 0) > 0) {
            <div class="text-sm font-medium text-amber-700 dark:text-amber-300 mt-1 whitespace-normal">
                Müşteri borcu {{ money(item().clientOutstandingAmount) }}
            </div>
        }
    `
})
export class TodayMoneyComponent {
    readonly item = input.required<TodayItemVm>();
    readonly status = computed(() => visitPaymentStatus(this.item()));
    readonly money = (amount: number | null) => formatMoney(amount, 'TRY');
}
