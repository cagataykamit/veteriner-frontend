/** Gün sonu uçlarının yanıtları (`DAILY_TRANSACTIONS_REPORT_API_CONTRACT.md`); enum değerleri metin gelir. */
import type { TodayOpenItemsDto } from '@/app/entities/visit/models/visit-api.model';

export type DailyTransactionKind = 'Charge' | 'ChargeVoid' | 'ChargeCorrection' | 'Payment' | 'PaymentVoid' | 'PaymentCorrection';
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
    netCollectedAmount: number;
    correctionCount: number;
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
    netAmount: number;
    salesCollectedAmount: number;
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
