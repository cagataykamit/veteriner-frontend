import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CHECKOUT_METHOD_LABEL, roundMoney, type CheckoutPaymentMethod } from '@/app/features/visits/checkout/data/visit-checkout.rules';
import { formatMoney } from '@/app/shared/utils/money.utils';

export interface VisitCheckoutReceiptData {
    clinicName: string;
    dateText: string;
    clientName: string;
    petName: string;
    charges: Array<{ description: string; amount: number }>;
    payments: Array<{ method: CheckoutPaymentMethod; amount: number }>;
    creditUsed: number;
    /** Alınanın hesaptan fazla kısmı; müşteri kredisine yazıldı. */
    creditAdded: number;
    remaining: number;
    /** Müşterinin bu hesaba dahil edilmeyen önceki borcu (bilgi satırı). */
    otherDebt: number;
}

/**
 * Ziyaret ve tahsilat özeti (CHECKOUT-001 K10): satış fişi deseni, A5 yazdırılır, resmî belge değildir. Yazdırmada mevcut `.sale-receipt`
 * kuralı kullanılır (`_print.scss`); yeni baskı stili yok.
 */
@Component({
    selector: 'app-visit-checkout-receipt',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let d = data();
        <article class="sale-receipt mx-auto max-w-md p-5 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border text-sm" aria-label="Ziyaret ve tahsilat özeti">
            <header class="text-center mb-4">
                <div class="text-xs uppercase tracking-wide text-muted-color">{{ d.clinicName }}</div>
                <h2 class="m-0 mt-1 text-lg font-semibold">Ziyaret ve tahsilat özeti</h2>
                <div class="text-muted-color">{{ d.dateText }}</div>
            </header>

            <dl class="m-0 mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt class="text-muted-color">Müşteri</dt>
                <dd class="m-0">{{ d.clientName }}</dd>
                <dt class="text-muted-color">Hasta</dt>
                <dd class="m-0">{{ d.petName }}</dd>
            </dl>

            @if (d.charges.length > 0) {
                <table class="w-full border-collapse mb-3">
                    <thead>
                        <tr class="border-b border-surface text-left">
                            <th class="py-1 font-medium">Hizmet / ürün</th>
                            <th class="py-1 font-medium text-right">Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (c of d.charges; track $index) {
                            <tr class="align-top">
                                <td class="py-1 pr-2">{{ c.description }}</td>
                                <td class="py-1 text-right whitespace-nowrap">{{ money(c.amount) }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            }

            <dl class="m-0 border-t border-surface pt-2 grid grid-cols-2 gap-y-1">
                <dt class="font-semibold">Toplam</dt>
                <dd class="m-0 text-right font-semibold">{{ money(total()) }}</dd>
                @if (d.creditUsed > 0) {
                    <dt>Krediden</dt>
                    <dd class="m-0 text-right">{{ money(d.creditUsed) }}</dd>
                }
                @for (p of d.payments; track $index) {
                    <dt>{{ methodLabel(p.method) }}</dt>
                    <dd class="m-0 text-right">{{ money(p.amount) }}</dd>
                }
                @if (d.creditAdded > 0) {
                    <dt>Krediye yazılan</dt>
                    <dd class="m-0 text-right">{{ money(d.creditAdded) }}</dd>
                }
                <dt class="font-semibold">{{ d.remaining > 0 ? 'Kalan borç' : 'Kalan' }}</dt>
                <dd class="m-0 text-right font-semibold">{{ money(d.remaining) }}</dd>
            </dl>

            @if (d.otherDebt > 0) {
                <p class="mt-3 mb-0 text-xs text-muted-color">Önceki gelişlerden kalan borç: {{ money(d.otherDebt) }} (bu özete dahil değildir).</p>
            }
            <p class="mt-4 mb-0 text-xs text-center text-muted-color">Bu özet bilgi amaçlıdır; fatura veya e-belge değildir.</p>
        </article>
    `
})
export class VisitCheckoutReceiptComponent {
    readonly data = input.required<VisitCheckoutReceiptData>();

    readonly total = computed(() => roundMoney(this.data().charges.reduce((s, c) => s + c.amount, 0)));

    protected money(n: number): string {
        return formatMoney(n, 'TRY');
    }

    protected methodLabel(m: CheckoutPaymentMethod): string {
        return CHECKOUT_METHOD_LABEL[m];
    }
}
