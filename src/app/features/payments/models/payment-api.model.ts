/**
 * Backend Veteriner API — ödeme DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface PaymentListItemDto {
    id: string;
    tenantId?: string;
    clientId?: string | null;
    ownerId?: string | null;
    clientName?: string | null;
    ownerName?: string | null;
    petId?: string | null;
    animalId?: string | null;
    petName?: string | null;
    animalName?: string | null;
    appointmentId?: string | null;
    amount?: number | string | null;
    totalAmount?: number | string | null;
    paymentAmount?: number | string | null;
    currency?: string | null;
    currencyCode?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    lifecycleStatus?: string | null;
    lifecycle?: string | null;
    method?: string | null;
    paymentMethod?: string | null;
    methodType?: string | null;
    dueDateUtc?: string | null;
    dueAtUtc?: string | null;
    paidAtUtc?: string | null;
    paymentDateUtc?: string | null;
    paidOnUtc?: string | null;
    createdAtUtc?: string | null;
    createdOnUtc?: string | null;
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
    ownerId?: string | null;
    clientName?: string | null;
    ownerName?: string | null;
    petId?: string | null;
    animalId?: string | null;
    petName?: string | null;
    animalName?: string | null;
    appointmentId?: string | null;
    amount?: number | string | null;
    totalAmount?: number | string | null;
    paymentAmount?: number | string | null;
    currency?: string | null;
    currencyCode?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    lifecycleStatus?: string | null;
    lifecycle?: string | null;
    method?: string | null;
    paymentMethod?: string | null;
    methodType?: string | null;
    note?: string | null;
    notes?: string | null;
    description?: string | null;
    dueDateUtc?: string | null;
    dueAtUtc?: string | null;
    paidAtUtc?: string | null;
    paymentDateUtc?: string | null;
    paidOnUtc?: string | null;
    createdAtUtc?: string | null;
    createdOnUtc?: string | null;
    updatedAtUtc?: string | null;
    updatedOnUtc?: string | null;
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
