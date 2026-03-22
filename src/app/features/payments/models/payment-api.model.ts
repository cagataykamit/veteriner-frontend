/**
 * Backend Veteriner API — ödeme DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface PaymentListItemDto {
    id: string;
    tenantId?: string;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    amount?: number | null;
    currency?: string | null;
    status?: string | null;
    method?: string | null;
    dueDateUtc?: string | null;
    paidAtUtc?: string | null;
    createdAtUtc?: string | null;
}

export interface PaymentListItemDtoPagedResult {
    items?: PaymentListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface PaymentDetailDto {
    id: string;
    tenantId?: string;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    petName?: string | null;
    amount?: number | null;
    currency?: string | null;
    status?: string | null;
    method?: string | null;
    note?: string | null;
    dueDateUtc?: string | null;
    paidAtUtc?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

export interface PaymentCreateRequestDto {
    clientId: string;
    petId: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    dueDateUtc?: string | null;
    paidAtUtc?: string | null;
    note?: string | null;
}
