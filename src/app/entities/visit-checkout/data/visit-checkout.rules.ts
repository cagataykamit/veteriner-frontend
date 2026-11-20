/**
 * "Hesabı kapat" panelinin hesap kuralları (CHECKOUT-001, BE `VISIT_CHECKOUT_API_CONTRACT.md` §0 ve §4). Saf fonksiyonlar; panel yalnız
 * bunları çağırır. Tutarlar kuruşa yuvarlanır.
 */

export type CheckoutPaymentMethod = 'cash' | 'card' | 'transfer';

export const CHECKOUT_METHOD_LABEL: Record<CheckoutPaymentMethod, string> = {
    cash: 'Nakit',
    card: 'Kart',
    transfer: 'Havale'
};

/** Kalem başına karar: ücrete çevrilecek, ücretsiz sayılacak ya da karar bekliyor. */
export type ItemDecision = 'pending' | 'convert' | 'waive';

/** Tahsilat satırı: bir satır bir ödeme isteğidir (K8). */
export interface CheckoutPaymentLine {
    id: string;
    method: CheckoutPaymentMethod;
    amount: number | null;
    /** Yalnız nakitte; boşsa sunucu Ana kasayı kullanır. */
    cashRegisterId: string | null;
}

export interface CheckoutTotals {
    /** Ücrete çevrilecek kalemler + seçili açık ücretler. */
    due: number;
    credit: number;
    paid: number;
    /** Borç olarak kalan (sıfırın altına inmez). */
    remaining: number;
    /** Alınan borçtan fazlaysa krediye yazılacak kısım. */
    overpaid: number;
}

export interface ChargeToSettle {
    chargeId: string;
    outstanding: number;
}

export interface AllocationLine {
    chargeId: string;
    amount: number;
}

export interface AllocationPlan {
    credit: AllocationLine[];
    /** `lines` ile aynı sırada; `creditAmount` satırın ücretlere bağlanmayan kısmıdır (FIN-005, müşteri kredisine yazılır). */
    lines: Array<{ allocations: AllocationLine[]; creditAmount: number }>;
}

export const roundMoney = (n: number): number => Math.round(n * 100) / 100;

export function parseAmount(raw: string): number | null {
    const normalized = raw.replace(/\s/g, '').replace(',', '.');

    if (normalized === '') {
        return null;
    }

    const n = Number(normalized);

    return Number.isFinite(n) ? roundMoney(n) : null;
}

/** Kalemin tutarı: önerilen fiyat ya da resepsiyonun girdiği fiyat × miktar; fiyat yoksa `null`. */
export function itemAmount(quantity: number, unitPrice: number | null): number | null {
    return unitPrice === null ? null : roundMoney(quantity * unitPrice);
}

export function computeTotals(due: number, credit: number, paid: number): CheckoutTotals {
    const diff = roundMoney(due - credit - paid);

    return { due, credit, paid, remaining: diff > 0 ? diff : 0, overpaid: diff < 0 ? roundMoney(-diff) : 0 };
}

export function sumAmounts(values: Array<number | null>): number {
    return roundMoney(values.reduce<number>((s, v) => s + (v ?? 0), 0));
}

/** Boş ya da sıfır/negatif tutarlı satır kaydedilmez. */
export function lineError(line: Pick<CheckoutPaymentLine, 'amount'>): string | null {
    if (line.amount === null) {
        return 'Tutar girin.';
    }

    return line.amount <= 0 ? 'Tutar sıfırdan büyük olmalı.' : null;
}

export function creditError(credit: number, creditBalance: number, due: number): string | null {
    if (credit < 0) {
        return 'Kredi tutarı negatif olamaz.';
    }

    if (credit > creditBalance) {
        return 'Kullanılabilir krediden fazla.';
    }

    return credit > due ? 'Krediden hesaptan fazla düşülemez.' : null;
}

/**
 * Krediyi ve tahsilat satırlarını ücretlere sırayla dağıtır: önce kredi (K9), sonra satırlar sırasıyla. Ücretleri aşan kısım satırın
 * `creditAmount`'u olur (yalnız ödemede; kredi ücreti aşamaz, `creditError`). Her ödemede Σ tahsis + `creditAmount` = tutar.
 */
export function planAllocations(charges: readonly ChargeToSettle[], credit: number, lineAmounts: readonly number[]): AllocationPlan {
    const open = charges.map((c) => ({ chargeId: c.chargeId, left: roundMoney(c.outstanding) }));

    const take = (amount: number): { allocations: AllocationLine[]; rest: number } => {
        const allocations: AllocationLine[] = [];
        let rest = roundMoney(amount);

        for (const c of open) {
            if (rest <= 0) {
                break;
            }

            const part = roundMoney(Math.min(c.left, rest));

            if (part > 0) {
                allocations.push({ chargeId: c.chargeId, amount: part });
                c.left = roundMoney(c.left - part);
                rest = roundMoney(rest - part);
            }
        }

        return { allocations, rest };
    };

    const creditPart = take(credit);

    return {
        credit: creditPart.allocations,
        lines: lineAmounts.map((amount) => {
            const part = take(amount);

            return { allocations: part.allocations, creditAmount: part.rest };
        })
    };
}

/**
 * Geliş ücretsiz onayıyla mı tamamlanır (K6): gelişin hiç ücreti yok, bu kapanışta ücrete çevrilen kalem yok ve karar bekleyen kalem
 * kalmadı (hiç kalem yok ya da hepsi ücretsiz sayıldı). Karar bekleyen kalem varsa onaysız tamamlanır; Bugün'de "Ücret yok" kalır.
 */
export function completesWithoutCharge(visitChargeCount: number, convertCount: number, undecidedCount: number): boolean {
    return visitChargeCount === 0 && convertCount === 0 && undecidedCount === 0;
}
