/**
 * Backend Veteriner API — ödeme DTO’ları.
 */

/** Liste satırı — GET /payments */
export interface PaymentListItemDto {
    id: string;
    clinicId?: string;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    /** Backend enum (0 / 1 / 2) veya string. */
    method?: string | number | null;
    paidAtUtc?: string | null;
}

export interface PaymentListItemDtoPagedResult {
    items?: PaymentListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /payments/{id} */
export interface PaymentDetailDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    method?: string | number | null;
    paidAtUtc?: string | null;
    notes?: string | null;
}

export interface PaymentCreateRequestDto {
    clinicId?: string | null;
    clientId: string;
    petId?: string | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount: number;
    currency: string;
    method: number;
    paidAtUtc: string;
    notes?: string | null;
}
