import type { AdministrationDto } from '@/app/features/administrations/models/administration-api.model';
import type { ProductKindApi } from '@/app/entities/inventory/models/product-api.model';

/** Sınırlar `EXAMINATION_TEMPLATE_API_CONTRACT.md` §1 ile aynı (sunucu da denetler). */
export const EXAMINATION_TEMPLATE_NAME_MAX = 200;
export const EXAMINATION_TEMPLATE_VISIT_REASON_MAX = 500;
export const EXAMINATION_TEMPLATE_TEXT_MAX = 4000;
export const EXAMINATION_TEMPLATE_LINES_MAX = 20;

/** Satır ürün alanları kartın güncel hâlidir; `productIsActive = false` ise şablon uygulanamaz. */
export interface ExaminationTemplateLineDto {
    productId: string;
    productName: string;
    unit: string;
    productKind: ProductKindApi;
    productIsActive: boolean;
    quantity: number;
    /** Kartın bugünkü fiyatı (ön izleme; şablonda saklanmaz). */
    currentUnitPrice: number;
    currency: string;
}

/** `GET /api/v1/examination-templates` öğesi; `isSystem` kaydı salt okunurdur ve satırsızdır. */
export interface ExaminationTemplateDto {
    id: string;
    name: string;
    visitReason: string | null;
    findings: string | null;
    plan: string | null;
    isActive: boolean;
    isSystem: boolean;
    lines: ExaminationTemplateLineDto[];
    rowVersion: string;
}

export interface ExaminationTemplatePagedResultDto {
    items: ExaminationTemplateDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ExaminationTemplatesListQuery {
    search?: string;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
}

/** POST ve PUT gövdesi (PUT'ta `rowVersion` ayrıca gider); boş metin `null` gönderilir. */
export interface ExaminationTemplateUpsertRequest {
    name: string;
    visitReason: string | null;
    findings: string | null;
    plan: string | null;
    lines: { productId: string; quantity: number }[];
}

/** `POST /examinations/{id}/apply-template` yanıtı; `rowVersion` muayenenin yeni sürümüdür. */
export interface ExaminationTemplateApplyResultDto {
    examinationId: string;
    rowVersion: string;
    updatedFields: ('visitReason' | 'findings' | 'plan')[];
    administrations: AdministrationDto[];
    services: { productId: string; productName: string; unit: string; quantity: number; chargeSuggestionId: string | null }[];
}
