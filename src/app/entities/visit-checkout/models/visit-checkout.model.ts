/**
 * "Hesabı kapat" okuması (`GET /visits/{id}/checkout-summary`, BE `VISIT_CHECKOUT_API_CONTRACT.md`). `charges` yalnız `Charges.Read` varsa
 * dolar. Müşteri hayvanın güncel sahibidir.
 */
export type VisitCheckoutCareStatus = 'Waiting' | 'InProgress' | 'Completed';

export type VisitCheckoutChargeIndicator = 'NoChargeableWork' | 'ChargeMissing' | 'PaymentPending' | 'PartiallyPaid' | 'Paid';

export interface VisitCheckoutSummaryDto {
    visitId: string;
    clinicId: string;
    careStatus: VisitCheckoutCareStatus;
    arrivedAtUtc: string;
    completedAtUtc: string | null;
    isVoided: boolean;
    responsibleVeterinarianName: string | null;
    arrivalReason: string | null;
    petId: string;
    petName: string;
    speciesName: string | null;
    clientId: string;
    clientName: string;
    clientPhone: string | null;
    currency: string;
    charges: VisitCheckoutChargesDto | null;
}

export interface VisitCheckoutChargesDto {
    chargeIndicator: VisitCheckoutChargeIndicator | null;
    pendingItems: VisitCheckoutPendingItemDto[];
    visitCharges: VisitCheckoutChargeDto[];
    otherOpenCharges: VisitCheckoutOtherChargeDto[];
    creditBalance: number;
}

/** Ücret bekleyen kalem; `suggestedUnitPrice` yoksa fiyatı resepsiyon girer. */
export interface VisitCheckoutPendingItemDto {
    id: string;
    sourceType: string;
    petId: string;
    petName: string;
    description: string;
    quantity: number;
    unit: string;
    suggestedUnitPrice: number | null;
    occurredAtUtc: string;
}

export interface VisitCheckoutChargeDto {
    chargeId: string;
    petId: string | null;
    petName: string | null;
    description: string;
    amount: number;
    allocatedAmount: number;
    outstandingAmount: number;
    createdAtUtc: string;
}

/** Müşterinin bu gelişe ait olmayan açık ücreti (aynı klinik); panelde seçili gelmez. */
export interface VisitCheckoutOtherChargeDto extends VisitCheckoutChargeDto {
    visitId: string | null;
    visitArrivedAtUtc: string | null;
}
