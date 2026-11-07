import type { PerformanceAppointmentCountsDto } from '@/app/features/reports/performance/models/performance-summary.model';

/**
 * `GET /api/v1/reports/clinics-overview` (`CLINICS_OVERVIEW_API_CONTRACT.md`, TIER-007). Şube satırı o klinikle açılan işletme
 * performansı özetiyle aynı hesaptır; izni olmayan alan `null` gelir ve sütun çizilmez.
 */
export interface ClinicsOverviewFiguresDto {
    netChargeAmount: number | null;
    netCollectedAmount: number | null;
    visitCount: number | null;
    examinationCount: number | null;
    appointments: PerformanceAppointmentCountsDto | null;
}

export interface ClinicsOverviewLineDto {
    current: ClinicsOverviewFiguresDto;
    /** `compare=false` ise `null`. */
    previous: ClinicsOverviewFiguresDto | null;
    /** Bugünkü açık alacak; dönemden bağımsız. Toplamda müşteri sayısı tekildir. */
    outstanding: { totalOutstandingAmount: number; clientCount: number } | null;
}

export interface ClinicsOverviewRowDto extends ClinicsOverviewLineDto {
    clinicId: string;
    clinicName: string;
}

export interface ClinicsOverviewDto {
    currency: string;
    from: string;
    to: string;
    previousFrom: string | null;
    previousTo: string | null;
    clinics: ClinicsOverviewRowDto[];
    total: ClinicsOverviewLineDto;
}
