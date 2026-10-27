import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TagModule } from 'primeng/tag';
import type { TodayItemVm } from '@/app/entities/visit/models/visit-vm.model';
import { todayOpenChips } from '@/app/entities/visit/utils/visit-status.utils';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';

/**
 * Bugün satırı: hesaplanan açık iş çipleri (renk + simge + metin), ziyaretin ücret / ödenen / kalan tutarı ve müşterinin toplam borcu.
 * Değerler yoksa (yetkisiz veya planlı satır) hiçbir şey göstermez. Ödemesi açık çip, `canPay` ise ödemeye geçiş düğmesidir; "Ücret bekliyor" çipi Ücretlendir ekranına götürür.
 */
@Component({
    selector: 'app-today-money',
    standalone: true,
    imports: [TagModule, MoneyPipe],
    host: { class: 'flex flex-wrap gap-1 min-w-0' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (chip of chips(); track chip.key) {
            @if (chip.reviewable) {
                <button type="button" class="p-0 border-0 bg-transparent cursor-pointer rounded-border" [attr.title]="chip.title + ' — Ücretlendir'" [attr.aria-label]="chip.label + ', Ücretlendir'" (click)="review.emit()">
                    <p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" />
                </button>
            } @else if (chip.payable && canPay()) {
                <button type="button" class="p-0 border-0 bg-transparent cursor-pointer rounded-border" [attr.title]="chip.title + ' — ödeme al'" [attr.aria-label]="chip.label + ', ödeme al'" (click)="pay.emit()">
                    <p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" />
                </button>
            } @else {
                <span [attr.title]="chip.title"><p-tag [value]="chip.label" [severity]="chip.severity" [icon]="chip.icon" /></span>
            }
        }
        @if ((item().chargedAmount ?? 0) > 0) {
            <div class="w-full text-sm text-muted-color mt-1 whitespace-normal">
                <div>Ücret {{ item().chargedAmount | money }}</div>
                <div>Ödenen {{ item().allocatedAmount | money }}</div>
                <div [class.font-medium]="(item().outstandingAmount ?? 0) > 0">Kalan {{ item().outstandingAmount | money }}</div>
            </div>
        }
        @if ((item().clientOutstandingAmount ?? 0) > 0) {
            <div class="w-full text-sm font-medium text-amber-700 dark:text-amber-300 mt-1 whitespace-normal">Müşteri borcu {{ item().clientOutstandingAmount | money }}</div>
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
}
