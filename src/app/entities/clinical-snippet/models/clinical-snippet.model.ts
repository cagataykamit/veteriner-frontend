/** Sınırlar `CLINICAL_SNIPPET_API_CONTRACT.md` §1 ile aynı (sunucu da denetler ve normalleştirir). */
export const CLINICAL_SNIPPET_SHORTCUT_MIN = 2;
export const CLINICAL_SNIPPET_SHORTCUT_MAX = 30;
export const CLINICAL_SNIPPET_TITLE_MAX = 100;
export const CLINICAL_SNIPPET_BODY_MAX = 2000;
/** Kiracı başına tavan (pasifler dahil); seçici tüm aktif listeyi tek istekte bu sayfa boyuyla çeker. */
export const CLINICAL_SNIPPET_LIMIT = 200;

/** `GET /api/v1/clinical-snippets` öğesi; `shortcut` `#`'siz ve küçük harfle saklanır. */
export interface ClinicalSnippetDto {
    id: string;
    shortcut: string;
    title: string;
    body: string;
    isActive: boolean;
    createdAtUtc: string;
    updatedAtUtc: string | null;
    rowVersion: string;
}

export interface ClinicalSnippetPagedResultDto {
    items: ClinicalSnippetDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ClinicalSnippetsListQuery {
    search?: string;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
}

/** POST ve PUT gövdesi (PUT'ta `rowVersion` ayrıca gider; üç alan da yazılır). */
export interface ClinicalSnippetUpsertRequest {
    shortcut: string;
    title: string;
    body: string;
}
