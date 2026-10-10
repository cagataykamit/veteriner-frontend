export interface ChargeVm {
    id: string;
    clientId: string;
    clientName: string;
    petId: string | null;
    petName: string | null;
    visitId: string | null;
    examinationId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    currency: string;
    createdAtUtc: string;
}

export interface ChargesPagedVm {
    items: ChargeVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /charges sorgusu. Sözleşmede tarih/durum filtresi yoktur. */
export interface ChargesListQuery {
    page?: number;
    pageSize?: number;
    clinicId?: string;
    clientId?: string;
    petId?: string;
    visitId?: string;
    examinationId?: string;
}

export interface CreateChargeRequest {
    clientId: string;
    petId?: string | null;
    visitId?: string | null;
    examinationId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    /** Form başına bir kez üretilen anahtar; aynı anahtarla tekrar istek ikinci ücret üretmez. */
    requestId: string;
}

export interface ChargeCreateResultVm {
    /** `false`: aynı `requestId` ile daha önce kaydedilmiş ücret döndü. */
    created: boolean;
    charge: ChargeVm;
}
