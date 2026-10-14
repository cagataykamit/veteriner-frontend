import { Component, computed, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import { todayOpenChips } from '@/app/features/visits/utils/visit-status.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/**
 * Bugün satırı: hesaplanan açık iş çipleri (renk + simge + metin), ziyaretin ücret / ödenen / kalan tutarı ve müşterinin toplam borcu.
 * Değerler yoksa (yetkisiz veya planlı satır) hiçbir şey göstermez. Ödemesi açık çip, `canPay` ise ödemeye geçiş düğmesidir.
 */
@Component({
    selector: 'app-today-money',
    standalone: true,
    imports: [TagModule],
    host: { class: 'flex flex-wrap gap-1 min-w-0' },
    template: `
        @for (chip of chips(); track chip.key) {
            @if (chip.payable && canPay()) {
                <button
                    type="button"
                    class="p-0 border-0 bg-transparent cursor-pointer rounded-border"
                    [attr.title]="chip.title + ' — ödeme al'"
                    [attr.aria-label]="chip.label + ', ödeme al'"
                    (click)="pay.emit()"
                >
                    <p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" />
                </button>
            } @else {
                <span [attr.title]="chip.title"><p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" /></span>
            }
        }
        @if ((item().chargedAmount ?? 0) > 0) {
            <div class="w-full text-sm text-muted-color mt-1 whitespace-normal">
                <div>Ücret {{ money(item().chargedAmount) }}</div>
                <div>Ödenen {{ money(item().allocatedAmount) }}</div>
                <div [class.font-medium]="(item().outstandingAmount ?? 0) > 0">Kalan {{ money(item().outstandingAmount) }}</div>
            </div>
        }
        @if ((item().clientOutstandingAmount ?? 0) > 0) {
            <div class="w-full text-sm font-medium text-amber-700 dark:text-amber-300 mt-1 whitespace-normal">
                Müşteri borcu {{ money(item().clientOutstandingAmount) }}
            </div>
        }
    `
})
export class TodayMoneyComponent {
    readonly item = input.required<TodayItemVm>();
    /** Ödeme oluşturma yetkisi var ve işletme salt okunur değil. */
    readonly canPay = input(false);
    readonly pay = output<void>();
    readonly chips = computed(() => todayOpenChips(this.item()));
    readonly money = (amount: number | null) => formatMoney(amount, 'TRY');
}
