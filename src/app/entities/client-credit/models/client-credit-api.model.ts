/**
 * Müşteri kredisi ve mahsup — `CLIENT_CREDIT_API_CONTRACT.md` §4–§7 (FIN-005). Kredi alınan paradan doğar (fazla ödeme ya da
 * avans) ya da içe aktarmada eski programdan devreden alacaktır (§13, `OpeningBalance`; kaynak ödemesi yoktur). Enum alanları
 * metin gelir ve ekranda olduğu gibi etiketlenir (VM'e çevrilmez).
 */
export type ClientCreditSource = 'Overpayment' | 'Prepayment' | 'OpeningBalance';

/** Sunucu hesaplar: `Open` kalanı olan, `Used` tamamı mahsup edilmiş, `Refunded` iade edilmiş, `Voided` kaynak ödemeyle iptal. */
export type ClientCreditStatus = 'Open' | 'Used' | 'Refunded' | 'Voided';

export type ClientCreditRefundMethod = 'Cash' | 'Card' | 'Transfer';

export interface ClientCreditApplicationItemDto {
    id: string;
    chargeId: string;
    chargeDescription: string;
    amount: number;
    createdAtUtc: string;
    reversedAtUtc: string | null;
    reverseReason: string | null;
}

export interface ClientCreditDto {
    id: string;
    clinicId: string;
    clientId: string;
    /** Devir alacağında `null` (kaynak ödeme yok). */
    sourcePaymentId: string | null;
    source: ClientCreditSource;
    status: ClientCreditStatus;
    amount: number;
    usedAmount: number;
    remainingAmount: number;
    currency: string;
    createdAtUtc: string;
    createdByUserId: string;
    refundedAtUtc: string | null;
    refundedAmount: number | null;
    refundMethod: ClientCreditRefundMethod | null;
    refundReason: string | null;
    voidedAtUtc: string | null;
    applications: ClientCreditApplicationItemDto[];
    /** İçe aktarmanın açtığı devir alacağı (ADR-048 T3). */
    isImported: boolean;
}

export interface ClientCreditApplyLine {
    chargeId: string;
    amount: number;
}

/** `POST /clients/{id}/credits/apply` gövdesi; `clinicId` aktif klinik varsa yazılır (context-first). */
export interface ClientCreditApplyRequestDto {
    clinicId?: string;
    requestId: string;
    allocations: ClientCreditApplyLine[];
}

export interface ClientCreditAppliedItemDto {
    id: string;
    creditId: string;
    chargeId: string;
    amount: number;
    createdAtUtc: string;
}

export interface ClientCreditApplyResultDto {
    clientId: string;
    clinicId: string;
    appliedAmount: number;
    remainingCreditBalance: number;
    applications: ClientCreditAppliedItemDto[];
}

/** `POST /clients/{id}/credits/{creditId}/refund` gövdesi; kalan kredinin tamamı iade edilir. */
export interface ClientCreditRefundRequestDto {
    reason: string;
    method: ClientCreditRefundMethod;
    /** Nakit iadede kasa (TIER-008); boşsa sunucu Ana kasayı kullanır. */
    cashRegisterId?: string;
}
