import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { TodayItemVm } from '@/app/entities/visit/models/visit-vm.model';
import { todayOpenChips } from '@/app/entities/visit/utils/visit-status.utils';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { formatMoney } from '@/app/shared/utils/money.utils';

/**
 * Bugün satırı: hesaplanan açık iş çipleri (renk + simge + metin) ve ziyaretin ödenmemiş kalanı ("Kalan ₺…"; ücret ve ödenen ipucunda).
 * Değerler yoksa (yetkisiz veya planlı satır) hiçbir şey göstermez. Ödemesi açık çip, `canPay` ise ödemeye geçiş düğmesidir; "Ücret bekliyor"
 * çipi Ücretlendir ekranına götürür. Müşterinin toplam borcu ziyarete değil müşteriye aittir; Bugün'de müşteri hücresinde gösterilir.
 */
@Component({
    selector: 'app-today-money',
    standalone: true,
    imports: [TagModule, MoneyPipe],
    host: { class: 'flex flex-wrap items-center gap-1 min-w-0' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (chip of chips(); track chip.key) {
            @if (chip.reviewable) {
                <button type="button" class="p-0 border-0 bg-transparent cursor-pointer rounded-border touch:touch-hit" [attr.title]="chip.title + ' — Ücretlendir'" [attr.aria-label]="chip.label + ', Ücretlendir'" (click)="review.emit()">
                    <p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" />
                </button>
            } @else if (chip.payable && canPay()) {
                <button type="button" class="p-0 border-0 bg-transparent cursor-pointer rounded-border touch:touch-hit" [attr.title]="chip.title + ' — ödeme al'" [attr.aria-label]="chip.label + ', ödeme al'" (click)="pay.emit()">
                    <p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" />
                </button>
            } @else {
                <span [attr.title]="chip.title"><p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" /></span>
            }
        }
        @if ((item().outstandingAmount ?? 0) > 0) {
            <span class="text-sm font-semibold whitespace-nowrap text-amber-700 dark:text-amber-300" [attr.title]="remainingTitle()" data-testid="today-remaining">Kalan {{ item().outstandingAmount | money }}</span>
        }
    `
})
export class TodayMoneyComponent {
    readonly item = input.required<TodayItemVm>();
    /** Ödeme oluşturma yetkisi var ve işletme salt okunur değil. */
    readonly canPay = input(false);
    readonly pay = output<void>();
    /** Ücret bekleyen kalemleri Ücretlendir ekranında aç. */
    readonly review = output<void>();
    readonly chips = computed(() => todayOpenChips(this.item()));
    /** Satırda yalnız kalan; ücret ve ödenen ipucunda (ayrıntı ziyaret sayfasında). */
    readonly remainingTitle = computed(() => `Ücret ${formatMoney(this.item().chargedAmount)} · Ödenen ${formatMoney(this.item().allocatedAmount)}`);
}
