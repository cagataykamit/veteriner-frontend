import {
    CHARGE_QUANTITY_MAX,
    CHARGE_QUANTITY_MAX_DECIMALS,
    CHARGE_UNIT_PRICE_MAX,
    CHARGE_UNIT_PRICE_MAX_DECIMALS,
    computeChargeAmount,
    hasAtMostDecimals
} from '@/app/features/charges/utils/charge-amount.utils';
import type { CreateSaleRequest, SalePaymentMethodApi } from '@/app/features/sales/models/sale-api.model';
import type { SaleProductVm } from '@/app/features/sales/models/sale-vm.model';

/** Sözleşme sınırı (`DIRECT_SALE_API_CONTRACT.md` §3.1): sepette en çok 50 satır. */
export const SALE_MAX_LINES = 50;

export type SalePaymentMode = 'full' | 'partial' | 'credit';

export interface CartLine {
    /** Sepet içi benzersiz anahtar (aynı ürün iki satırda olabilir). */
    key: string;
    product: SaleProductVm;
    quantity: number | null;
    unitPrice: number | null;
    /** Boş = otomatik (sunucu FEFO ile seçer). */
    batchId: string;
}

export interface CartPaymentInput {
    mode: SalePaymentMode;
    method: SalePaymentMethodApi;
    /** Yalnız `partial` modunda kullanılır. */
    amount: number | null;
}

/** Ürünün varsayılan fiyatı ve miktar 1 ile yeni satır; miktar ve fiyat satırda düzenlenir. */
export function newCartLine(product: SaleProductVm, key: string): CartLine {
    return { key, product, quantity: 1, unitPrice: product.unitPrice, batchId: '' };
}

/**
 * Okuyucu/Enter ile ürün seçimi: barkod ya da SKU tam eşleşmesi, yoksa tek sonuç; belirsizse `null` (liste gösterilir).
 */
export function pickScannedProduct(term: string, results: readonly SaleProductVm[]): SaleProductVm | null {
    const t = term.trim().toLocaleLowerCase('tr-TR');

    if (!t) {
        return null;
    }

    const exact = results.filter((p) => p.barcode.toLocaleLowerCase('tr-TR') === t || p.sku.toLocaleLowerCase('tr-TR') === t);

    if (exact.length === 1) {
        return exact[0];
    }

    return exact.length === 0 && results.length === 1 ? results[0] : null;
}

/** Satır tutarı: `round(miktar × birimFiyat, 2)`; geçersiz girdide 0 sayılır (satır hatası ayrıca gösterilir). */
export function cartLineAmount(line: Pick<CartLine, 'quantity' | 'unitPrice'>): number {
    return computeChargeAmount(line.quantity, line.unitPrice) ?? 0;
}

/** Sepet toplamı kuruş toplamıyla hesaplanır (kayan nokta kayması olmaz). */
export function cartTotal(lines: readonly Pick<CartLine, 'quantity' | 'unitPrice'>[]): number {
    return lines.reduce((cents, line) => cents + Math.round(cartLineAmount(line) * 100), 0) / 100;
}

/** Satırın kullanıcıya gösterilecek ilk hatası; geçerliyse `null`. */
export function cartLineError(line: Pick<CartLine, 'quantity' | 'unitPrice'>): string | null {
    const { quantity, unitPrice } = line;

    if (quantity == null || !(quantity > 0)) {
        return 'Miktar 0\'dan büyük olmalı.';
    }

    if (quantity > CHARGE_QUANTITY_MAX || !hasAtMostDecimals(quantity, CHARGE_QUANTITY_MAX_DECIMALS)) {
        return `Miktar en çok ${CHARGE_QUANTITY_MAX_DECIMALS} ondalıklı ve ${CHARGE_QUANTITY_MAX} altında olmalı.`;
    }

    if (unitPrice == null || !(unitPrice > 0)) {
        return 'Birim fiyat 0\'dan büyük olmalı.';
    }

    if (unitPrice > CHARGE_UNIT_PRICE_MAX || !hasAtMostDecimals(unitPrice, CHARGE_UNIT_PRICE_MAX_DECIMALS)) {
        return `Birim fiyat en çok ${CHARGE_UNIT_PRICE_MAX_DECIMALS} ondalıklı olmalı.`;
    }

    return computeChargeAmount(quantity, unitPrice) == null ? 'Satır tutarı sıfıra yuvarlanıyor.' : null;
}

/**
 * Ödeme tutarı: peşin müşteride her zaman toplam; müşterili satışta moda göre toplam, girilen kısmi tutar ya da ödeme yok (veresiye).
 * `null`: ödeme gönderilmez.
 */
export function effectivePaymentAmount(total: number, isWalkIn: boolean, payment: CartPaymentInput): number | null {
    if (isWalkIn || payment.mode === 'full') {
        return total;
    }

    return payment.mode === 'partial' ? payment.amount : null;
}

/** Ödeme bloğunun hatası; `partial` tutarı 0 ile toplam arasında (toplam dahil değil) olmalıdır. */
export function paymentError(total: number, isWalkIn: boolean, payment: CartPaymentInput): string | null {
    if (isWalkIn || payment.mode !== 'partial') {
        return null;
    }

    const amount = payment.amount;

    if (amount == null || !(amount > 0) || !hasAtMostDecimals(amount, 2)) {
        return 'Kısmi ödeme tutarı 0\'dan büyük olmalı (en çok 2 ondalık).';
    }

    return amount >= total ? 'Kısmi ödeme toplamdan az olmalı; tamamını almak için "Tam ödeme" seçin.' : null;
}

export function cartRequestError(lines: readonly CartLine[], total: number, isWalkIn: boolean, payment: CartPaymentInput): string | null {
    if (lines.length === 0) {
        return 'Sepet boş.';
    }

    if (lines.length > SALE_MAX_LINES) {
        return `Sepette en çok ${SALE_MAX_LINES} satır olabilir.`;
    }

    if (lines.some((l) => cartLineError(l) != null)) {
        return 'Satırlardaki hataları düzeltin.';
    }

    return paymentError(total, isWalkIn, payment);
}

export function toCreateSaleRequest(input: {
    lines: readonly CartLine[];
    clientId: string;
    clinicId: string;
    notes: string;
    requestId: string;
    payment: CartPaymentInput;
}): CreateSaleRequest {
    const total = cartTotal(input.lines);
    const isWalkIn = !input.clientId;
    const amount = effectivePaymentAmount(total, isWalkIn, input.payment);
    const notes = input.notes.trim();

    return {
        clinicId: input.clinicId || undefined,
        clientId: input.clientId || undefined,
        requestId: input.requestId,
        notes: notes || undefined,
        lines: input.lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity!,
            unitPrice: l.unitPrice!,
            batchId: l.batchId || undefined
        })),
        payment: amount == null ? undefined : { method: input.payment.method, amount }
    };
}
