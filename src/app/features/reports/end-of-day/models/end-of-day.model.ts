/** Gün sonu uçlarının yanıtları (`DAILY_TRANSACTIONS_REPORT_API_CONTRACT.md`); enum değerleri metin gelir. */
import type { TodayOpenItemsDto } from '@/app/entities/visit/models/visit-api.model';

/** `CreditRefund`: müşteri kredisinin iadesi, kasadan çıkış (FIN-005, `CLIENT_CREDIT_API_CONTRACT.md` §9). */
export type DailyTransactionKind = 'Charge' | 'ChargeVoid' | 'ChargeCorrection' | 'Payment' | 'PaymentVoid' | 'PaymentCorrection' | 'CreditRefund';
export type CashPaymentMethod = 'Cash' | 'Card' | 'Transfer';

export interface DailyTransactionTotalsDto {
    grossChargeAmount: number;
    grossChargeCount: number;
    salesChargeAmount: number;
    voidedChargeAmount: number;
    voidedChargeCount: number;
    netChargeAmount: number;
    collectedAmount: number;
    collectedCount: number;
    salesCollectedAmount: number;
    voidedCollectionAmount: number;
    voidedCollectionCount: number;
    /** Alınan − iptal − kredi iadesi. */
    netCollectedAmount: number;
    correctionCount: number;
    /** FIN-005 kredi iadesi; eski yanıtta yoksa 0 sayılır. */
    refundedCreditAmount?: number;
    refundedCreditCount?: number;
}

export interface DailyTransactionItemDto {
    occurredAtUtc: string;
    kind: DailyTransactionKind;
    referenceId: string;
    clientId: string;
    clientName: string;
    petId?: string | null;
    petName?: string | null;
    description?: string | null;
    /** Düzeltme satırında `null`. */
    amount?: number | null;
    paymentMethod?: CashPaymentMethod | null;
    isDirectSale: boolean;
    isVoided: boolean;
    reason?: string | null;
    performedByUserId?: string | null;
    performedByName?: string | null;
    clinicId: string;
}

export interface DailyTransactionsDto {
    currency: string;
    from: string;
    to: string;
    totals: DailyTransactionTotalsDto;
    totalCount: number;
    items: DailyTransactionItemDto[];
}

/** `ReportListState` sonuç biçimi: sayfa bilgisi istemcide eklenir. */
export interface DailyTransactionsResultVm extends DailyTransactionsDto {
    readonly page: number;
    readonly pageSize: number;
}

export interface CashSummaryAmountsDto {
    collectedAmount: number;
    collectedCount: number;
    voidedAmount: number;
    voidedCount: number;
    /** Tahsilat − iptal − kredi iadesi. */
    netAmount: number;
    salesCollectedAmount: number;
    /** FIN-005 kredi iadesi (kasadan çıkış); eski yanıtta yoksa 0 sayılır. Kullanıcı kırılımında iadeyi yapana yazılır. */
    refundedCreditAmount?: number;
    refundedCreditCount?: number;
}

export interface CashSummaryMethodDto extends CashSummaryAmountsDto {
    paymentMethod: CashPaymentMethod;
}

export interface CashSummaryDayDto extends CashSummaryAmountsDto {
    date: string;
    cashNetAmount: number;
    cardNetAmount: number;
    transferNetAmount: number;
}

export interface CashSummaryUserDto extends CashSummaryAmountsDto {
    userId?: string | null;
    userName?: string | null;
}

export interface CashSummaryDto {
    currency: string;
    from: string;
    to: string;
    totals: CashSummaryAmountsDto;
    byMethod: CashSummaryMethodDto[];
    byDay: CashSummaryDayDto[];
    byUser: CashSummaryUserDto[];
}

export interface EndOfDayOpenItemsDto {
    from: string;
    to: string;
    clinicId: string;
    openItems: TodayOpenItemsDto;
}
