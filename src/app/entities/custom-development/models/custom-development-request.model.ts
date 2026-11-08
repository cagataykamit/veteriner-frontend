/** Talebin konusu (`CUSTOM_DEVELOPMENT_REQUESTS_API_CONTRACT.md` §1); `Migration` geçiş desteği talebidir (§11, TIER-021). */
export type CustomDevelopmentTargetKind = 'Screen' | 'Report' | 'Output' | 'Migration';

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
    /** Yalnız `targetKind = Migration` talepte dolu (§11.4). */
    readonly migration?: MigrationSupportDetailsDto | null;
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

/** Geçiş desteğinde kaynak program; liste `GET /imports/source-profiles` ile aynı enum (`IMPORT_API_CONTRACT.md` §4.5). */
export type MigrationSourceProgram = 'Generic' | 'Kolayvet' | 'EVet';

export type MigrationRecordVolume = 'Unknown' | 'UpTo1000' | 'UpTo5000' | 'UpTo10000' | 'Over10000';

export type MigrationMeetingDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type MigrationMeetingTime = 'Morning' | 'Midday' | 'Afternoon';

/** Ücret bilgisi pakete göre backend'de belirlenir (§11.3); panel yalnız metne çevirir, tutar yoktur. */
export type MigrationSupportFee = 'Free' | 'Quoted';

/** `meetingDays` ve `meetingTimes` bayrak listesidir: `"Monday, Thursday"`. */
export interface MigrationSupportDetailsDto {
    readonly sourceProgram: MigrationSourceProgram;
    readonly recordVolume: MigrationRecordVolume;
    readonly meetingDays: string;
    readonly meetingTimes: string;
    readonly fee: MigrationSupportFee;
    readonly meetingDurationMinutes: number;
}

/** GET `.../migration-support` (§11.4). */
export interface MigrationSupportOverviewDto {
    readonly items: readonly CustomDevelopmentRequestDto[];
    readonly openCount: number;
    readonly maxOpen: number;
    readonly fee: MigrationSupportFee;
    readonly meetingDurationMinutes: number;
}

export interface CreateMigrationSupportRequestBody {
    readonly sourceProgram: MigrationSourceProgram;
    readonly otherProgramName: string | null;
    readonly recordVolume: MigrationRecordVolume;
    readonly meetingDays: string;
    readonly meetingTimes: string;
    readonly note: string | null;
}

/** Alan sınırları backend kuralıyla aynı (§11.2); doğrusu sunucudadır. */
export const MIGRATION_SUPPORT_LIMITS = { programName: 120, note: 2000 } as const;
