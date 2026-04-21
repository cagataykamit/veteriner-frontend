import type { PaymentListItemDto } from '@/app/features/payments/models/payment-api.model';

/** GET `/api/v1/reports/payments` */
export interface PaymentsReportDto {
    totalCount?: number | string | null;
    totalAmount?: number | string | null;
    items?: PaymentListItemDto[] | null;
}

