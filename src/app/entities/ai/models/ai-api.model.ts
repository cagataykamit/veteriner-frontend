/**
 * Yapay zekâ API DTO'ları — Veteriner `docs/AI_HISTORY_SUMMARY_API_CONTRACT.md` §1–2 ve `docs/AI_DRAFTS_API_CONTRACT.md` §3.
 * Yalnızca mapper ve servis kullanır.
 */

/** `GET /api/v1/ai/status`; dolar tutarı içermez. */
export interface AiStatusDto {
    isAvailable: boolean;
    /** İlk engelin kodu: `Ai.NotConfigured` → `Ai.ClinicNotEnabled` → `Ai.ClinicQuotaExceeded` → `Ai.SystemBudgetExhausted`; klinik yoksa `Clinics.ClinicSelectionRequired`. */
    unavailableCode?: string | null;
    isConfigured: boolean;
    isClinicEnabled: boolean;
    /** 0–100; kliniğin bu ayki (İstanbul takvim ayı) kullanımının sınıra oranı. */
    clinicMonthUsedPercent: number;
}

/** Kaynak kayıt: `Pet` ya da zaman çizelgesi türü. `occurredAtUtc` `Pet` için `null`. */
export interface AiSourceRefDto {
    type: string;
    id: string;
    occurredAtUtc?: string | null;
}

export interface PetHistorySummaryItemDto {
    text: string;
    sources?: AiSourceRefDto[] | null;
}

export interface PetHistorySummarySectionDto {
    /** Sabit sıra: Alerts, ActiveIssues, RecentVisits, Medications, Vaccinations, LabResults, FollowUps; boş bölüm gelmez. */
    kind: string;
    title: string;
    items?: PetHistorySummaryItemDto[] | null;
}

export interface PetHistorySummaryCoverageDto {
    fromUtc?: string | null;
    toUtc?: string | null;
    recordCount: number;
    /** Yalnız sıfırdan büyük türler. */
    recordCounts?: Record<string, number> | null;
    omittedTypes?: string[] | null;
    truncated: boolean;
}

/** `POST /api/v1/pets/{id}/ai/history-summary` (200). `isDraft` her zaman `true`: kaydedilmez. */
export interface PetHistorySummaryDto {
    petId: string;
    status: 'Generated' | 'NoRecords' | string;
    isDraft: boolean;
    generatedAtUtc: string;
    model?: string | null;
    coverage?: PetHistorySummaryCoverageDto | null;
    sections?: PetHistorySummarySectionDto[] | null;
    droppedItemCount: number;
}

/** `GET /api/v1/ai/drafts/{id}` ve kabul/at yanıtı. `content` yalnız `status: Draft` iken dolu; şeması özelliğe özgüdür. */
export interface AiDraftDto {
    id: string;
    feature: string;
    status: string;
    targetType: string;
    targetId: string;
    sources?: AiSourceRefDto[] | null;
    content?: Record<string, unknown> | null;
    model?: string | null;
    createdByUserId: string;
    createdAtUtc: string;
    expiresAtUtc: string;
    decidedByUserId?: string | null;
    decidedAtUtc?: string | null;
    appliedRecordId?: string | null;
}

/** `POST /api/v1/ai/drafts/{id}/accept` gövdesi; içerik aynıysa `Accepted`, farklıysa `AcceptedWithEdits`. */
export interface AiDraftAcceptRequestDto {
    editedContent?: Record<string, unknown>;
}
