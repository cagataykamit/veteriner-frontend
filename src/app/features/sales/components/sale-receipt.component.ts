import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SaleDetailVm } from '@/app/features/sales/models/sale-vm.model';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Bilgi amaçlı satış fişi (ADR-016 karar 10): sade, yazdırılabilir; resmî belge, fatura veya e-belge değildir.
 * Yazdırma yerleşimi `_print.scss` içindeki `.sale-receipt` kuralıyla yapılır.
 */
@Component({
    selector: 'app-sale-receipt',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let s = sale();
        <article class="sale-receipt mx-auto max-w-md p-5 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border text-sm" aria-label="Satış fişi">
            <header class="text-center mb-4">
                <h2 class="m-0 text-lg font-semibold">Satış fişi</h2>
                <div class="text-muted-color">{{ soldAt() }}</div>
                @if (s.isVoided) {
                    <div class="mt-2 font-semibold uppercase tracking-wide">İptal edildi</div>
                }
            </header>

            <div class="mb-3">
                <span class="text-muted-color">Müşteri: </span>{{ s.clientName }}
            </div>

            <table class="w-full border-collapse mb-3">
                <thead>
                    <tr class="border-b border-surface text-left">
                        <th class="py-1 font-medium">Ürün</th>
                        <th class="py-1 font-medium text-right">Miktar</th>
                        <th class="py-1 font-medium text-right">Fiyat</th>
                        <th class="py-1 font-medium text-right">Tutar</th>
                    </tr>
                </thead>
                <tbody>
                    @for (line of s.lines; track line.id) {
                        <tr class="align-top">
                            <td class="py-1 pr-2">
                                {{ line.productName }}
                                @if (line.batchText) {
                                    <div class="text-xs text-muted-color">Parti: {{ line.batchText }}</div>
                                }
                            </td>
                            <td class="py-1 text-right whitespace-nowrap">{{ line.quantityText }} {{ line.unit }}</td>
                            <td class="py-1 text-right whitespace-nowrap">{{ line.unitPriceText }}</td>
                            <td class="py-1 text-right whitespace-nowrap">{{ line.lineAmountText }}</td>
                        </tr>
                    }
                </tbody>
            </table>

            <dl class="m-0 border-t border-surface pt-2 grid grid-cols-2 gap-y-1">
                <dt class="font-semibold">Toplam</dt>
                <dd class="m-0 text-right font-semibold">{{ s.totalText }}</dd>
                <dt>Ödenen</dt>
                <dd class="m-0 text-right">{{ s.paidText }}</dd>
                @if (s.hasOutstanding) {
                    <dt>Kalan borç</dt>
                    <dd class="m-0 text-right">{{ s.outstandingText }}</dd>
                }
            </dl>

            @if (s.notes) {
                <p class="mt-3 mb-0"><span class="text-muted-color">Not: </span>{{ s.notes }}</p>
            }
            <p class="mt-4 mb-0 text-xs text-center text-muted-color">Bu fiş bilgi amaçlıdır; resmî belge, fatura veya e-belge değildir.</p>
        </article>
    `
})
export class SaleReceiptComponent {
    readonly sale = input.required<SaleDetailVm>();

    protected soldAt(): string {
        return formatUtcIsoAsLocalDateTimeDisplay(this.sale().soldAtUtc);
    }
}
