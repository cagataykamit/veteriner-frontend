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
    origin: EDocumentOrigin;
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
    origin: EDocumentOrigin;
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
    outstandingAmount: number;
    createdAtUtc: string;
    /** Ücret kesilemeyen bir belgeye bağlıysa o belge (yeniden dene / vazgeç). */
    failedDocumentId: string | null;
    /** Belgenin neden kesilmediği; hazırsa `null`. */
    reason: string | null;
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
    availableProviders: EDocumentProviderOption[];
}

/** `OAuth`: sağlayıcının kendi ekranında onay; `Credentials`: anahtar/kullanıcı alanları (ileride). */
export interface EDocumentProviderOption {
    provider: string;
    providerName: string;
    configured: boolean;
    connectionMethod: 'OAuth' | 'Credentials';
}

export type EDocumentOrigin = 'Manual' | 'Payment' | 'Automatic';

export type EDocumentAutoIssueMode = 'Off' | 'OnPayment' | 'EndOfDay';

export interface ClinicEDocumentSettingsDto {
    clinicId: string;
    autoIssueMode: EDocumentAutoIssueMode;
    /** "SS:dd", İstanbul saati. */
    endOfDayTime: string;
    issueOnPaymentByDefault: boolean;
    autoIssueEnabledAtUtc: string | null;
    taxpayerType: 'SelfEmployed' | 'Company' | 'Both' | null;
    /** Hizmet / ürün satırında kesilecek belge: e-SMM ya da fatura (alıcıya göre e-Arşiv / e-Fatura). */
    serviceDocument: 'ESmm' | 'Invoice' | null;
    productDocument: 'ESmm' | 'Invoice' | null;
    /** Otomatik kesme kalıcı bir entegratör sorunuyla (yetki, kontör, bağlantı) durduysa an; ayar kaydedilince sürer. */
    autoIssuePausedAtUtc: string | null;
    autoIssuePauseReason: string | null;
}

export interface EDocumentRemindersDto {
    connected: boolean;
    undocumentedPaidCount: number;
    failedCount: number;
}

export interface EDocumentBatchResultDto {
    documents: EDocumentDto[];
    skipped: { chargeId: string; code: string; message: string }[];
}
