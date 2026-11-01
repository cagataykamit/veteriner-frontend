import type { PaymentAllocationInput } from '@/app/entities/payment/models/payment-create.model';

/** Yeni ödemeler yalnızca TRY (`PAYMENT_ALLOCATION_API_CONTRACT.md` §2). */
export const PAYMENT_CURRENCY = 'TRY';

/** Kuruş cinsinden tam sayı; toplamlar kayan nokta hatası olmadan yapılır. */
function toCents(amount: number): number {
    return Math.round(amount * 100);
}

function hasAtMostTwoDecimals(amount: number): boolean {
    return Math.abs(amount * 100 - toCents(amount)) < 1e-6;
}

/** Girilmemiş (`null`/0) tahsis satırı gönderilmez; hata değildir. */
function isBlank(amount: number | null | undefined): boolean {
    return amount == null || amount === 0;
}

/** Bir ücret satırına girilen tutarın hatası; geçerliyse veya boşsa `null`. */
export function allocationAmountError(amount: number | null | undefined, outstandingAmount: number): string | null {
    if (isBlank(amount)) {
        return null;
    }

    if (!Number.isFinite(amount) || (amount as number) < 0) {
        return 'Geçerli bir tutar girin.';
    }

    if (!hasAtMostTwoDecimals(amount as number)) {
        return 'En fazla 2 ondalık girin.';
    }

    if (toCents(amount as number) > toCents(outstandingAmount)) {
        return 'Kalan tutarı aşamaz.';
    }

    return null;
}

/** Seçilen ücretlere tahsis edilen toplam (kuruş hatasız). */
export function allocationTotal(allocations: readonly PaymentAllocationInput[]): number {
    return allocations.reduce((sum, a) => sum + toCents(a.amount), 0) / 100;
}

/**
 * "Alınan tutar" hatası (`CLIENT_CREDIT_API_CONTRACT.md` §3): boşsa tahsis toplamı alınmış sayılır; toplamın altı reddedilir,
 * fazlası müşteri kredisine yazılır (`receivedCreditAmount`).
 */
export function receivedAmountError(received: number | null | undefined, allocated: number): string | null {
    if (received == null) {
        return null;
    }

    if (!Number.isFinite(received) || received <= 0) {
        return 'Geçerli bir tutar girin.';
    }

    if (!hasAtMostTwoDecimals(received)) {
        return 'En fazla 2 ondalık girin.';
    }

    if (toCents(received) < toCents(allocated)) {
        return 'Alınan tutar seçilen ücretlerin toplamından az olamaz.';
    }

    return null;
}

/** Alınan tutarın tahsis toplamını aşan kısmı (krediye yazılır); boş ya da eksikse 0. */
export function receivedCreditAmount(received: number | null | undefined, allocated: number): number {
    if (received == null || !Number.isFinite(received)) {
        return 0;
    }

    return Math.max(0, toCents(received) - toCents(allocated)) / 100;
}

/** Krediden mahsupta seçilen toplam kullanılabilir krediyi aşamaz (`CLIENT_CREDIT_API_CONTRACT.md` §4). */
export function creditApplyError(allocated: number, creditBalance: number): string | null {
    return toCents(allocated) > toCents(creditBalance) ? 'Seçilen tutar kullanılabilir krediyi aşamaz.' : null;
}

export function buildAllocations(
    charges: readonly { chargeId: string; outstandingAmount: number }[],
    amounts: Readonly<Record<string, number | null | undefined>>
): PaymentAllocationInput[] {
    return charges
        .filter((c) => !isBlank(amounts[c.chargeId]))
        .map((c) => ({ chargeId: c.chargeId, amount: amounts[c.chargeId] as number }));
}
