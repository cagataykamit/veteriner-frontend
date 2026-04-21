import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';

/** Randevu raporu tablo satırı — liste VM + klinik / not gösterimi. */
export type AppointmentReportRowVm = AppointmentListItemVm & {
    readonly clinicLabel: string;
    readonly notes: string;
};

export interface AppointmentsReportResultVm {
    readonly items: readonly AppointmentReportRowVm[];
    readonly totalCount: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
