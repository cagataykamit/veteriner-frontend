import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';

/** Ödeme raporu tablo satırı — liste VM + klinik / not gösterimi. */
export type PaymentReportRowVm = PaymentListItemVm & {
    readonly clinicLabel: string;
    readonly notes: string;
};

export interface PaymentsReportResultVm {
    readonly items: readonly PaymentReportRowVm[];
    readonly totalCount: number;
    /** Backend reports contract toplamı. */
    readonly totalAmount: number;
    readonly page: number;
    readonly pageSize: number;
    readonly totalPages: number;
}
