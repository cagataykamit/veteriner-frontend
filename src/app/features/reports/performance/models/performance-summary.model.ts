import type { CashSummaryAmountsDto, CashSummaryDayDto, CashSummaryMethodDto, CashSummaryUserDto, DailyTransactionTotalsDto } from '@/app/features/reports/end-of-day/models/end-of-day.model';

/**
 * `GET /api/v1/reports/performance-summary` (`PERFORMANCE_SUMMARY_API_CONTRACT.md`, REPORT-008 dilim 1).
 * Alan şekilleri ilgili raporlarla aynıdır; izni olmayan bölüm `null` gelir ve ekranda hiç çizilmez.
 */
export interface PerformanceCashDto {
    totals: CashSummaryAmountsDto;
    byMethod: CashSummaryMethodDto[];
    byDay: CashSummaryDayDto[];
    byUser: CashSummaryUserDto[];
}

export interface PerformanceVaccinationCountsDto {
    applied: number;
    scheduled: number;
}

export interface PerformanceAppointmentCountsDto {
    scheduled: number;
    completed: number;
    cancelled: number;
    noShow: number;
}

export interface PerformancePeriodDto {
    /** İstanbul takvim günü `yyyy-MM-dd`, ikisi dahil. */
    from: string;
    to: string;
    charges: DailyTransactionTotalsDto | null;
    cash: PerformanceCashDto | null;
    examinationCount: number | null;
    vaccinations: PerformanceVaccinationCountsDto | null;
    appointments: PerformanceAppointmentCountsDto | null;
}

export interface PerformanceSummaryDto {
    currency: string;
    current: PerformancePeriodDto;
    /** `compare=false` ise `null`. */
    previous: PerformancePeriodDto | null;
    /** Bugünkü açık alacak; tarih aralığından bağımsız. */
    outstanding: { totalOutstandingAmount: number; clientCount: number } | null;
}
