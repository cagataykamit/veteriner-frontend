export interface AiStatusVm {
    isAvailable: boolean;
    unavailableCode: string | null;
    /** 0–100; %80 ve üstünde sonucun altında uyarı notu çıkar (ADR-044 madde 7). */
    clinicMonthUsedPercent: number;
    /** Kalan kredi (aylık kota + fon), tam sayıya aşağı yuvarlı; sunucu bildirmediyse `null`. */
    creditsRemaining?: number | null;
    /** Aylık kotanın yenileneceği an; sunucu bildirmediyse `null` (istemci İstanbul ayından hesaplar). */
    quotaResetsAtUtc?: string | null;
}

/** Klinik ayarlarındaki sade kullanım satırı: yalnız oran ve yenilenme (dolar ve kredi yok). */
export interface AiClinicUsageVm {
    percent: number;
    /** "1 Aralık'ta yenilenir" */
    resetLabel: string;
    exhausted: boolean;
}

/** AI giriş düğmesinin görünümü; kural tek yerde (`aiEntryState`). */
export type AiEntryState = { readonly kind: 'hidden' } | { readonly kind: 'available' } | { readonly kind: 'disabled'; readonly reason: string };

/** Kaynak kayda giden çip: "Muayene · 10 Kas", "Hasta kartı". `link` yoksa çip bağlantısız metin olur. */
export interface AiSourceVm {
    type: string;
    id: string;
    label: string;
    icon: string;
    link: string[] | null;
}

export interface PetHistorySummaryItemVm {
    text: string;
    sources: AiSourceVm[];
}

export interface PetHistorySummarySectionVm {
    kind: string;
    /** Arayüzün başlığı (backend başlığı yalnız bilinmeyen türde kullanılır). */
    title: string;
    /** Uyarılar kırmızı çizgiyle ayrışır. */
    isAlert: boolean;
    items: PetHistorySummaryItemVm[];
}

export interface PetHistorySummaryVm {
    petId: string;
    /** `NoRecords`: model çağrılmadı, kota harcanmadı. */
    hasRecords: boolean;
    generatedAtUtc: string;
    coverage: {
        fromUtc: string | null;
        toUtc: string | null;
        recordCount: number;
        /** "5 muayene · 3 reçete · 4 aşı · 2 laboratuvar"; boşsa `''`. */
        countsLabel: string;
        /** Yetkisi olmadığı için okunmayan türler, küçük harf ("laboratuvar"); yoksa `null`. */
        omittedTypesLabel: string | null;
        truncated: boolean;
    };
    sections: PetHistorySummarySectionVm[];
    droppedItemCount: number;
}

/** `AI_DRAFTS_API_CONTRACT.md` §3; `content` yalnız `Draft` iken dolu. */
export interface AiDraftVm {
    id: string;
    feature: string;
    status: string;
    targetType: string;
    targetId: string;
    sources: AiSourceVm[];
    content: Record<string, unknown> | null;
    createdAtUtc: string;
    expiresAtUtc: string;
    decidedByUserId: string | null;
    decidedAtUtc: string | null;
    appliedRecordId: string | null;
}

/** Kabul edilmiş içeriğin kayıttaki izi ("AI taslağından · düzenlendi"). */
export interface AiProvenanceVm {
    draftId: string;
    feature: string;
    /** Kabulden önce düzenlendi ya da kabulden sonra kayıt değişti ("AI taslağından · düzenlendi"). */
    edited: boolean;
    /** İpucu: "Dr. Ayşe Kaya 19 Kas 14:36'da kabul etti."; bilinmiyorsa `null`. */
    acceptedByName: string | null;
    acceptedAtUtc: string | null;
}

/** Taslak üreten klinik özellikler (`AiDraftDto.feature`). */
export const AI_FEATURE_EXAM_NOTE = 'ExamNoteStructure';
export const AI_FEATURE_OWNER_EXPLANATION = 'OwnerExplanation';
export const AI_FEATURE_DISCHARGE_INSTRUCTIONS = 'DischargeInstructions';
