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

/** Klinik ayarlarındaki "Yapay zekâ" sayfası (§3a). Krediler tam sayıya aşağı yuvarlı; dolar yok. */
export interface ClinicAiSettingsVm {
    clinicId: string;
    isConfigured: boolean;
    isEnabled: boolean;
    isAvailable: boolean;
    unavailableCode: string | null;
    updatedAtUtc: string | null;
    hasAcknowledged: boolean;
    acknowledgedAtUtc: string | null;
    acknowledgementVersion: number;
    acknowledgementItems: string[];
    monthlyCredits: number;
    creditsUsedThisMonth: number;
    creditsRemaining: number;
    fundCredits: number;
    usedPercent: number;
    quotaResetsAtUtc: string | null;
    creditGrants: { id: string; kind: string; credits: number; createdAtUtc: string }[];
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

/** Doğal dille hasta araması (AI-006): anlaşılan filtre ve uyarılar. Filtre sunucu şemasıyla aynı kalır (`PetSearchFilterDto`). */
export interface PetSearchInterpretationVm {
    isEmpty: boolean;
    /** Modelin filtreye çeviremediği kısımlar ("ad ile arama"). */
    unsupported: string[];
    /** Geçersiz olduğu için uygulanmayan değerler. */
    dropped: string[];
}

/** Sonuçtaki eşleşen kayıt: kaynak çipi (kaydın sayfasına gider) + kısa metin ("Kusma", "Karma"). */
export interface PetSearchMatchVm {
    source: AiSourceVm;
    text: string;
    isOverdue: boolean;
}

export interface PetSearchItemVm {
    petId: string;
    name: string;
    speciesName: string;
    /** "Dişi · 3 yaş · Tekir" gibi kısa satır; bilgi yoksa boş. */
    detail: string;
    isDeceased: boolean;
    clientId: string | null;
    clientName: string;
    matches: PetSearchMatchVm[];
}

export interface PetSearchResultVm {
    items: PetSearchItemVm[];
    totalCount: number;
    page: number;
    pageSize: number;
    dropped: string[];
    truncated: boolean;
    /** "tedavi" gibi; okuma izni olmadığı için aranmayan kayıt türleri. */
    omittedTypesLabel: string | null;
}

/** "Şöyle anladım" çipi; `id` kaldırma işleminin anahtarıdır (`removePetSearchChip`). */
export interface PetSearchChipVm {
    id: string;
    label: string;
    icon: string;
}
