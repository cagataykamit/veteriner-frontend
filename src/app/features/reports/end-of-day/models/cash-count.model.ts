import type { CashSummaryMethodDto } from '@/app/features/reports/end-of-day/models/end-of-day.model';

/** Kasa sayımı kaydı (`CASH_COUNT_API_CONTRACT.md` §3.1). `expectedCashAmount` kayıt anındaki beklenen nakittir. */
export interface CashCountDto {
    id: string;
    clinicId: string;
    businessDate: string;
    currency: string;
    openingAmount: number;
    expectedCashAmount: number;
    expectedClosingAmount: number;
    countedAmount: number;
    differenceAmount: number;
    note: string | null;
    correctsCashCountId: string | null;
    createdByUserId: string;
    createdByName: string | null;
    createdAtUtc: string;
    isVoided: boolean;
    voidedAtUtc: string | null;
    voidedByUserId: string | null;
    voidedByName: string | null;
    voidReason: string | null;
}

/** GET `/api/v1/cash-counts/day`: `cash` kasa özetinin nakit satırının şu anki hâli; `cash.netAmount` beklenen nakittir. */
export interface CashCountDayDto {
    clinicId: string;
    businessDate: string;
    currency: string;
    cash: CashSummaryMethodDto;
    current: CashCountDto | null;
    expectedChangedSinceCount: boolean;
    previous: { businessDate: string; countedAmount: number } | null;
    history: CashCountDto[];
}

export interface CashCountPageDto {
    items: CashCountDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** Sayım ve düzeltme gövdesi; `expectedCashAmount` ekranda gösterilen beklenen nakittir (eskiyse 409 `CashCounts.ExpectedChanged`). */
export interface CashCountAmountsBody {
    openingAmount: number;
    countedAmount: number;
    expectedCashAmount: number;
    note: string | null;
}

/** Sunucu kuralı (`CashCount.MaxAmount`, `MaxNoteLength`); doğrusu backend'dedir. */
export const CASH_COUNT_MAX_AMOUNT = 10_000_000;
export const CASH_COUNT_NOTE_MAX = 500;
export const CASH_COUNT_EXPECTED_CHANGED_CODE = 'CashCounts.ExpectedChanged';
