/**
 * Backend Veteriner API — ödeme DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

/** Liste satırı — backend batch lookup ile `clientName` / `petName` doldurulur (yoksa ""). */
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
    /** Backend genelde 0/1/2 enum; bazen string. */
    method?: string | number | null;
    paymentMethod?: string | number | null;
    methodType?: string | number | null;
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

/** GET /payments/{id} — backend aggregate: tutar, kanal (method), ödeme zamanı (paidAtUtc), notlar. */
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
    /** Ödeme kanalı — backend enum (sayı) veya string. */
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
