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

/** GET /clients/{id}/payment-summary */
export interface ClientPaymentSummaryCurrencyTotalVm {
    currency: string;
    totalAmount: number | null;
}

export interface ClientPaymentSummaryRecentPaymentVm {
    id: string;
    paidAtUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    petId: string | null;
    petName: string | null;
    amount: number | null;
    currency: string | null;
    method: unknown;
    notes: string | null;
}

export interface ClientPaymentSummaryVm {
    clientId: string;
    clientName: string;
    totalPaymentsCount: number;
    /** Çoklu para biriminde 0 olabilir; asıl doğruluk `currencyTotals`. */
    totalPaidAmount: number | null;
    currencyTotals: ClientPaymentSummaryCurrencyTotalVm[];
    lastPaymentAtUtc: string | null;
    recentPayments: ClientPaymentSummaryRecentPaymentVm[];
}
