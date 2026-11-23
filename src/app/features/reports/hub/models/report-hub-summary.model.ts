/**
 * Rapor Merkezi ana ekran özeti (`GET /reports/hub-summary`, BE `REPORT_HUB_SUMMARY_API_CONTRACT.md`). Bölüm, aynı veriyi gösteren raporun
 * izni yoksa `null`; `todayCash`, `outstanding` ve `attention` dönemden bağımsızdır.
 */
export type ReportHubPeriod = 'today' | 'week' | 'month';

/** Eğilim noktası; `from`/`to` İstanbul günleri (yyyy-MM-dd), ikisi dahil. */
export interface ReportHubSeriesPointDto {
    from: string;
    to: string;
    value: number;
}

export interface ReportHubSummaryDto {
    period: ReportHubPeriod;
    clinicId: string;
    currency: string;
    generatedAtUtc: string;
    window: { from: string; to: string; previousFrom: string; previousTo: string };
    todayCash: {
        netCollectedAmount: number;
        collectedCount: number;
        last7Days: ReportHubSeriesPointDto[];
        /** `CashRegisters.Read` yoksa null. */
        mainRegisterBalance: number | null;
    } | null;
    turnover: { netChargeAmount: number; previousNetChargeAmount: number; series: ReportHubSeriesPointDto[] } | null;
    collections: { netAmount: number; collectedCount: number; byMethod: { paymentMethod: 'Cash' | 'Card' | 'Transfer'; netAmount: number }[] } | null;
    outstanding: { totalOutstandingAmount: number; clientCount: number; maxClientOutstandingAmount: number } | null;
    appointments: {
        totalCount: number;
        noShowCount: number;
        statusCounts: { scheduled: number; completed: number; cancelled: number; noShow: number };
        series: ReportHubSeriesPointDto[];
    } | null;
    examinations: { count: number; series: ReportHubSeriesPointDto[] } | null;
    vaccinations: { appliedCount: number; upcomingCount: number } | null;
    attention: {
        hbsNotEnteredPrescriptions: ReportHubPendingDto | null;
        hbsNotEnteredVaccinations: ReportHubPendingDto | null;
        endOfDayUnchargedVisitCount: number | null;
        overdueVaccinationCount: number | null;
        lowStockProductCount: number | null;
        /** Önceki günlerden kalan, hâlâ planlı randevu (§11); `Visits.Read` ve `Appointments.Read` yoksa null. */
        overdueAppointmentCount: number | null;
    };
}

export interface ReportHubPendingDto {
    count: number;
    oldestAtUtc: string | null;
}
