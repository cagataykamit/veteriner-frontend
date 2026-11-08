/** Talebin konusu (`CUSTOM_DEVELOPMENT_REQUESTS_API_CONTRACT.md` §1). */
export type CustomDevelopmentTargetKind = 'Screen' | 'Report' | 'Output';

export type CustomDevelopmentPriority = 'Low' | 'Normal' | 'High';

/** Akış backend'dedir (§2); panel geçerli sonraki durumları `nextStatuses` ile alır. */
export type CustomDevelopmentRequestStatus = 'Received' | 'InReview' | 'Planned' | 'OutOfScope' | 'Completed';

export interface CustomDevelopmentRequestDto {
    readonly id: string;
    readonly requestTitle: string;
    readonly requestText: string;
    readonly targetKind: CustomDevelopmentTargetKind;
    readonly requestTarget: string;
    readonly priority: CustomDevelopmentPriority;
    readonly status: CustomDevelopmentRequestStatus;
    readonly isOpen: boolean;
    readonly createdByUserId: string;
    readonly createdByName: string | null;
    readonly createdAtUtc: string;
    readonly statusChangedAtUtc: string | null;
    readonly decisionReason: string | null;
    readonly responseNote: string | null;
}

/** Kiracı listesi (§3.1); `openCount >= maxOpen` ise yeni talep açılamaz. */
export interface CustomDevelopmentRequestListDto {
    readonly items: readonly CustomDevelopmentRequestDto[];
    readonly openCount: number;
    readonly maxOpen: number;
}

export interface CreateCustomDevelopmentRequestBody {
    readonly requestTitle: string;
    readonly requestText: string;
    readonly targetKind: CustomDevelopmentTargetKind;
    readonly requestTarget: string;
    readonly priority: CustomDevelopmentPriority;
}

/** Alan sınırları backend kuralıyla aynı (§1); doğrusu sunucudadır, burada yalnız form ipucu. */
export const CUSTOM_DEVELOPMENT_LIMITS = { title: 120, text: 2000, target: 120, reason: 1000, note: 1000 } as const;
