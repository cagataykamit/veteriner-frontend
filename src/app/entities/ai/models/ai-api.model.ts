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
    /** 0–100; kliniğin bu ayki (İstanbul takvim ayı) kullanım oranı: harcanan / (harcanan + kalan kredi), sigorta daha yüksekse o. */
    clinicMonthUsedPercent: number;
    /** Kredi alanları (AI-007, sözleşme §1 ve §4a); aktif klinik yoksa `null`. İki ondalıklı. */
    monthlyCredits?: number | null;
    creditsUsedThisMonth?: number | null;
    /** Kalan aylık kota + fon bakiyesi. */
    creditsRemaining?: number | null;
    /** Fon bakiyesi (devreder). */
    fundCredits?: number | null;
    /** Aylık kotanın yenileneceği an (sonraki İstanbul ayının 1'i 00:00, UTC). */
    quotaResetsAtUtc?: string | null;
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

/** Kayıttaki "AI taslağından" izi (`AI_DRAFTS_API_CONTRACT.md` §8); muayene, bakım talimatı ve sahibe açıklamada. Klinik metin içermez. */
export interface AiProvenanceDto {
    draftId: string;
    feature: string;
    /** Kabulden önce düzenlendi mi (`AcceptedWithEdits`). */
    edited: boolean;
    acceptedByUserId?: string | null;
    acceptedByName?: string | null;
    acceptedAtUtc?: string | null;
}

/** Taslak üretim uçlarının gövdesi (`AiNoteDraftBody`): AI-001'de serbest not, AI-003/004'te isteğe bağlı vurgu. Not saklanmaz. */
export interface AiNoteDraftRequestDto {
    text?: string;
}

/**
 * Doğal dille hasta aramasının yapılandırılmış filtresi (AI-006; Veteriner `docs/AI_PATIENT_SEARCH_API_CONTRACT.md` §2). Tüm alanlar
 * isteğe bağlı; verilenler VE, listedeki terimler VEYA ile birleşir. Sunucu geçersiz değeri atar ve `dropped`'a yazar.
 */
export interface PetSearchFilterDto {
    species?: string[] | null;
    sex?: 'Male' | 'Female' | null;
    neutered?: boolean | null;
    ageMinYears?: number | null;
    ageMaxYears?: number | null;
    status?: 'Active' | 'Deceased' | null;
    /** `YYYY-MM-DD` (İstanbul günü, dahil). */
    from?: string | null;
    to?: string | null;
    clinicalTerms?: string[] | null;
    vaccineTerms?: string[] | null;
    vaccineState?: 'Any' | 'Applied' | 'Scheduled' | 'Overdue' | null;
    medicationTerms?: string[] | null;
}

/** `POST ai/pet-search/interpret` gövdesi; cümle saklanmaz. */
export interface PetSearchInterpretRequestDto {
    query: string;
}

export interface PetSearchInterpretationDto {
    filter: PetSearchFilterDto | null;
    isEmpty: boolean;
    unsupported?: string[] | null;
    dropped?: string[] | null;
    model?: string | null;
    interpretedAtUtc?: string | null;
}

/** `POST ai/pet-search/results` gövdesi; AI çağırmaz, kota harcamaz. */
export interface PetSearchRequestDto {
    filter: PetSearchFilterDto;
    page: number;
    pageSize: number;
}

export interface PetSearchMatchDto {
    type: string;
    id: string;
    occurredAtUtc?: string | null;
    text?: string | null;
    isOverdue?: boolean | null;
}

export interface PetSearchItemDto {
    petId: string;
    name: string;
    speciesCode?: string | null;
    speciesName?: string | null;
    breed?: string | null;
    sex?: string | null;
    isNeutered?: boolean | null;
    ageYears?: number | null;
    status?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    matches?: PetSearchMatchDto[] | null;
}

export interface PetSearchResultDto {
    filter: PetSearchFilterDto | null;
    dropped?: string[] | null;
    items?: PetSearchItemDto[] | null;
    totalCount: number;
    page: number;
    pageSize: number;
    truncated?: boolean | null;
    omittedTypes?: string[] | null;
}
