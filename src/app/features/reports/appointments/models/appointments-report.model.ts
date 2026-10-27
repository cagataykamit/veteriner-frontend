import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';

/** Randevu raporu tablo satırı — liste VM + klinik / not gösterimi. */
export type AppointmentReportRowVm = AppointmentListItemVm & {
    readonly clinicLabel: string;
    readonly notes: string;
};

export interface AppointmentsReportResultVm {
    readonly items: readonly AppointmentReportRowVm[];
    readonly totalCount: number;
    /** Backend yanıtında yoksa `null` (özet gösterilmez). */
    readonly noShowCount: number | null;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
