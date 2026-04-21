import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';

/** Muayene raporu tablo satırı — liste VM + klinik/bağlı randevu/değerlendirme/not alanları. */
export type ExaminationReportRowVm = ExaminationListItemVm & {
    readonly clinicLabel: string;
    readonly appointmentLinked: boolean;
    readonly findings: string;
    readonly assessment: string;
    readonly notes: string;
};

export interface ExaminationsReportResultVm {
    readonly items: readonly ExaminationReportRowVm[];
    readonly totalCount: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
