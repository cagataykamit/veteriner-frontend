/**
 * GET /api/v1/dashboard/finance-summary — Finance+ panel özeti.
 */

import type { DashboardTrendDayVm } from '@/app/features/dashboard/models/dashboard-trend.model';

export interface DashboardFinanceRecentPaymentItemDto {
    id: string;
    paidAtUtc?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    amount?: number | null;
    currency?: string | null;
    method?: number | string | null;
}

export interface DashboardFinanceSummaryDto {
    /** Faz 6B — son 7 gün günlük tahsilat tutarları (tek para birimi varsayımı; mapper toleranslı). */
    last7DaysPaid?: unknown | null;
    todayTotalPaid?: number | null;
    weekTotalPaid?: number | null;
    monthTotalPaid?: number | null;
    todayPaymentsCount?: number | null;
    weekPaymentsCount?: number | null;
    monthPaymentsCount?: number | null;
    recentPayments?: DashboardFinanceRecentPaymentItemDto[] | null;
}

export interface DashboardFinanceRecentPaymentVm {
    id: string;
    paidAtUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string | null;
    amount: number | null;
    currency: string | null;
    method: unknown;
}

/** Dashboard finans kartları + son ödemeler listesi. */
export interface DashboardFinanceSummaryVm {
    /** Son 7 gün günlük tahsilat (TRY gösterimi ile uyumlu). */
    last7DaysPaidTrend: readonly DashboardTrendDayVm[];
    todayTotalPaid: number | null;
    weekTotalPaid: number | null;
    monthTotalPaid: number | null;
    todayPaymentsCount: number | null;
    weekPaymentsCount: number | null;
    monthPaymentsCount: number | null;
    recentPayments: DashboardFinanceRecentPaymentVm[];
}
