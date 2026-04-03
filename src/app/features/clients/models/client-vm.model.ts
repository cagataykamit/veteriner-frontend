import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';

export interface ClientListItemVm {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    createdAtUtc: string | null;
}

export interface PetsSummaryVm {
    totalCount: number;
    items: { id: string; name: string }[];
}

export interface AppointmentsSummaryVm {
    totalCount: number;
    upcomingCount: number | null;
}

export interface ClientDetailVm {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    address: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

/** `GET .../clients/{id}/recent-summary` eşlemesi. */
export interface ClientRecentSummaryVm {
    clientId: string;
    /** Sıra backend’de (tarih desc, id desc). */
    appointments: AppointmentListItemVm[];
    examinations: ExaminationListItemVm[];
}
