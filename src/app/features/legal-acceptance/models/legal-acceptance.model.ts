import type { LegalDocumentType } from '@/app/entities/legal-document/utils/legal-documents.utils';

/** Belge ve güncel sürümü (`GET /public/legal-documents`, bekleyen kabul, davet `requiredLegalDocuments`). */
export interface LegalDocumentVersionDto {
    documentType: LegalDocumentType;
    version: string;
}

/** `GET/POST /me/legal-acceptances` yanıtı (`LEGAL_ACCEPTANCE_API_CONTRACT.md` §4–5). */
export interface MyLegalAcceptanceStatusDto {
    requiresAcceptance: boolean;
    pendingDocuments: LegalDocumentVersionDto[];
}
