/**
 * e-belge API DTO'ları — backend `docs/E_DOCUMENTS_API_CONTRACT.md` (ADR-036 Dilim 3–4).
 * Kimlik bilgisi (belirteç) hiçbir yanıtta yoktur; alıcı kimliği maskeli gelir.
 */

export type EDocumentType = 'ESmm' | 'EArchive' | 'EInvoice';

export type EDocumentStatus = 'Draft' | 'Sending' | 'Issued' | 'Failed' | 'Discarded' | 'CancelRequested' | 'Cancelled' | 'CancelRejected';

export type EDocumentConnectionStatus = 'NotConnected' | 'Connected' | 'AccountSelectionRequired' | 'ReauthorizationRequired';

export type EDocumentEnvironment = 'Test' | 'Live';

export interface EDocumentBuyerDto {
    kind: 'Individual' | 'Corporate';
    name: string;
    identityMasked: string;
    isUnknownBuyer: boolean;
    taxOffice: string | null;
    province?: string | null;
    district?: string | null;
    addressLine?: string | null;
}

export interface EDocumentLineDto {
    chargeId: string;
    description: string;
    quantity: number;
    unit: string | null;
    grossAmount: number;
    vatRate: number;
    lineKind: 'Service' | 'Product';
}

export interface EDocumentErrorDto {
    kind: string;
    message: string;
    providerCode: string | null;
}

export interface EDocumentDto {
    id: string;
    clinicId: string;
    clientId: string;
    clientName: string;
    documentType: EDocumentType;
    status: EDocumentStatus;
    provider: string;
    providerName: string;
    isTest: boolean;
    documentNumber: string | null;
    documentUuid: string | null;
    buyer: EDocumentBuyerDto;
    lines: EDocumentLineDto[];
    totalAmount: number;
    providerTotal: number | null;
    withholdingRate: number | null;
    saleId: string | null;
    visitId: string | null;
    note: string | null;
    createdAtUtc: string;
    issuedAtUtc: string | null;
    cancellableUntilUtc: string | null;
    canCancel: boolean;
    canRetry: boolean;
    canDiscard: boolean;
    canDownloadPdf: boolean;
    cancelReason: string | null;
    cancelledAtUtc: string | null;
    discardReason: string | null;
    lastError: EDocumentErrorDto | null;
    attemptCount: number;
}

export interface EDocumentListItemDto {
    id: string;
    clinicId: string;
    clientId: string;
    clientName: string;
    documentType: EDocumentType;
    status: EDocumentStatus;
    documentNumber: string | null;
    totalAmount: number;
    createdAtUtc: string;
    issuedAtUtc: string | null;
    isTest: boolean;
    lastErrorMessage: string | null;
}

export interface PagedDto<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface EDocumentPreviewGroupDto {
    documentType: EDocumentType;
    chargeIds: string[];
    totalAmount: number;
    lineCount: number;
}

export interface EDocumentPreviewDto {
    clientId: string;
    clientName: string;
    buyer: EDocumentBuyerDto | null;
    missingBuyerFields: string[];
    connection: { status: EDocumentConnectionStatus; environment: EDocumentEnvironment | null; providerName: string | null };
    groups: EDocumentPreviewGroupDto[];
    skipped: { chargeId: string; reason: 'AlreadyDocumented' | 'Voided' }[];
}

export interface UndocumentedChargeDto {
    chargeId: string;
    clientId: string;
    clientName: string;
    petId: string | null;
    petName: string | null;
    visitId: string | null;
    saleId: string | null;
    description: string;
    amount: number;
    createdAtUtc: string;
}

/** Belge kaynağı: tam olarak biri. */
export interface EDocumentSource {
    chargeIds?: string[];
    saleId?: string;
    visitId?: string;
}

export interface EDocumentConnectionDto {
    clinicId: string;
    provider: string | null;
    providerName: string | null;
    environment: EDocumentEnvironment | null;
    status: EDocumentConnectionStatus;
    accountId: string | null;
    accountName: string | null;
    connectedAtUtc: string | null;
    lastVerifiedAtUtc: string | null;
    lastVerificationOk: boolean | null;
    lastVerificationMessage: string | null;
    accountChoices: { accountId: string; accountName: string; taxNumber: string | null }[] | null;
    availableProviders: { provider: string; providerName: string; configured: boolean }[];
}
