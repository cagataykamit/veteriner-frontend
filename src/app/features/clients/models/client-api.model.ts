/**
 * Swagger ile uyumlu ham DTO'lar (Backend Veteriner API).
 * İleride API'ye ek alan gelince burada genişletilir.
 */

export interface ClientListItemDto {
    id: string;
    tenantId: string;
    fullName?: string | null;
    phone?: string | null;
    /** Swagger sonraki sürümlerde eklenebilir — opsiyonel */
    email?: string | null;
    createdAtUtc?: string | null;
}

export interface ClientListItemDtoPagedResult {
    items?: ClientListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ClientDetailDto {
    id: string;
    tenantId: string;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/**
 * POST /clients gövdesi — camelCase (Swagger ile doğrulanmalı).
 * Opsiyonel alanlar backend’de yoksa mapper’dan çıkarılabilir.
 */
export interface ClientUpsertRequestDto {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
}

/** GET /clients/{id}/recent-summary — panel müşteri detay özeti. */
export interface ClientRecentAppointmentSummaryItemDto {
    id: string;
    scheduledAtUtc?: string | null;
    petId?: string | null;
    petName?: string | null;
    status?: string | number | null;
    notes?: string | null;
}

export interface ClientRecentExaminationSummaryItemDto {
    id: string;
    examinedAtUtc?: string | null;
    petId?: string | null;
    petName?: string | null;
    visitReason?: string | null;
}

export interface ClientRecentSummaryDto {
    clientId: string;
    recentAppointments?: ClientRecentAppointmentSummaryItemDto[] | null;
    recentExaminations?: ClientRecentExaminationSummaryItemDto[] | null;
}

/** GET /clients/{id}/payment-summary — Finance+ müşteri ödeme özeti. */
export interface ClientPaymentSummaryCurrencyTotalDto {
    currency?: string | null;
    totalAmount?: number | null;
}

export interface ClientPaymentSummaryRecentPaymentDto {
    id: string;
    paidAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    petId?: string | null;
    petName?: string | null;
    amount?: number | null;
    currency?: string | null;
    method?: number | string | null;
    notes?: string | null;
}

export interface ClientPaymentSummaryDto {
    clientId: string;
    clientName?: string | null;
    totalPaymentsCount?: number | null;
    totalPaidAmount?: number | null;
    currencyTotals?: ClientPaymentSummaryCurrencyTotalDto[] | null;
    lastPaymentAtUtc?: string | null;
    recentPayments?: ClientPaymentSummaryRecentPaymentDto[] | null;
}
