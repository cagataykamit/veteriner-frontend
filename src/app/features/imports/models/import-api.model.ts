/** Veri içe aktarma sözleşmesi (Veteriner `docs/IMPORT_API_CONTRACT.md`, B1–B4). JSON camelCase. */

export type ImportTable = 'customers' | 'pets' | 'vaccinations';

export type ImportBatchStatus =
    | 'Uploaded'
    | 'Mapped'
    | 'Validating'
    | 'Validated'
    | 'ValidationFailed'
    | 'Committing'
    | 'Committed'
    | 'CommitFailed'
    | 'RollingBack'
    | 'RolledBack'
    | 'PartiallyRolledBack'
    | 'RollbackFailed'
    | 'Discarded'
    | 'Expired';

export type ImportColumnConfidence = 'Exact' | 'Alias' | 'None';
export type ImportIssueSeverity = 'Info' | 'Warning' | 'Error';
export type ImportValueKind = 'species' | 'breed' | 'vaccine' | 'color';
export type ImportDuplicateClientMode = 'Match' | 'Skip' | 'Error';
export type ImportOnErrors = 'SkipErrorRows' | 'FailIfAny';
export type ImportFileFormat = 'xlsx' | 'csv';

export interface ImportTableSummaryDto {
    total: number;
    valid: number;
    warning: number;
    error: number;
    willCreate: number;
    willMatch: number;
    willSkip: number;
    created: number;
    matched: number;
    skipped: number;
    failed: number;
}

export interface ImportSummaryDto {
    customers: ImportTableSummaryDto;
    pets: ImportTableSummaryDto;
    vaccinations: ImportTableSummaryDto;
}

export interface ImportColumnDto {
    source: string;
    suggested: string | null;
    confidence: ImportColumnConfidence;
    mapped: string | null;
}

export interface ImportTableInfoDto {
    table: ImportTable;
    rowCount: number;
    columns: ImportColumnDto[];
}

export interface ImportWarningDto {
    code: string;
    table?: ImportTable | null;
    message: string;
}

export interface ImportProgressDto {
    phase: string;
    processed: number;
    total: number;
}

export interface ImportBatchDto {
    id: string;
    status: ImportBatchStatus;
    name: string | null;
    clinicId: string | null;
    validationId: string | null;
    createdAtUtc: string;
    updatedAtUtc: string | null;
    validatedAtUtc: string | null;
    committedAtUtc: string | null;
    rolledBackAtUtc: string | null;
    remindersReleasedAtUtc: string | null;
    payloadPurgedAtUtc: string | null;
    summary: ImportSummaryDto;
    /** B4: yoksa null/undefined. */
    progress?: ImportProgressDto | null;
    /** Listede null. */
    tables?: ImportTableInfoDto[] | null;
    /** Yalnız yükleme yanıtında. */
    warnings?: ImportWarningDto[] | null;
}

export interface ImportBatchPageDto {
    items: ImportBatchDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ImportValueMappingDto {
    kind: ImportValueKind;
    source: string;
    /** `null`: bilinçli atla. */
    targetId: string | null;
}

export interface ImportMappingRequestDto {
    columns: Partial<Record<ImportTable, Record<string, string>>>;
    valueMappings: ImportValueMappingDto[];
    options: { onDuplicateClient: ImportDuplicateClientMode };
}

export interface ImportUnmappedValueDto {
    kind: ImportValueKind;
    source: string;
    rowCount: number;
    blocking: boolean;
}

export interface ImportReminderImpactDto {
    vaccinationsWithDueDate: number;
    vaccinationsWithFutureDueDate: number;
    vaccinationsWithPastDueDate: number;
    clientsWithEmail: number;
    emailsWithinReminderWindow: number;
    reminderWindowDays: number;
    tenantRemindersEnabled: boolean;
    excludedByDefault: boolean;
}

export interface ImportIssueCountDto {
    code: string;
    severity: ImportIssueSeverity;
    rowCount: number;
}

export interface ImportPreviewDto {
    validationId: string | null;
    status: ImportBatchStatus;
    summary: ImportSummaryDto;
    unmappedValues: ImportUnmappedValueDto[];
    reminderImpact: ImportReminderImpactDto;
    issueCounts: ImportIssueCountDto[];
    canCommit: boolean;
    blockers: string[];
    payloadPurged: boolean;
}

export interface ImportRowIssueDto {
    severity: ImportIssueSeverity;
    code: string;
    field: string | null;
    message: string;
}

export interface ImportRowDto {
    table: ImportTable;
    rowNumber: number;
    validation: { status: string; action: string | null };
    apply: { status: string; targetId: string | null };
    issues: ImportRowIssueDto[];
    /** Özgün satır: başlık → metin. */
    source: Record<string, string | null>;
}

export interface ImportRowPageDto {
    items: ImportRowDto[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ImportRowsQuery {
    table?: ImportTable;
    status?: 'Valid' | 'Warning' | 'Error';
    code?: string;
    page: number;
    pageSize: number;
}

export interface ImportCommitRequestDto {
    validationId: string;
    onErrors: ImportOnErrors;
}

/** `GET .../progress` (B4, §7.14): hafif yoklama yanıtı. `phase` yalnız `Committing` iken dolu. */
export interface ImportCommitProgressDto {
    id: string;
    status: ImportBatchStatus;
    phase: string | null;
    processed: number;
    total: number;
    updatedAtUtc: string | null;
    committedAtUtc: string | null;
    /** `Committing` ve false: işçi bekleniyor / devralınacak. */
    leaseActive: boolean;
}

/** `POST .../release-reminders` 200 yanıtı (B4, §7.10). `note` yalnız kiracı aşı hatırlatması kapalıysa dolu. */
export interface ImportReleaseRemindersResultDto {
    batch: ImportBatchDto;
    reminderImpact: ImportReminderImpactDto;
    alreadyReleased: boolean;
    note: string | null;
}

export type ImportBlockedPolicy = 'Fail' | 'DeleteUnblockedOnly';
export type ImportRollbackEntity = 'Client' | 'Pet' | 'Vaccination';

export interface ImportRollbackCountsDto {
    clients: number;
    pets: number;
    vaccinations: number;
}

/** Engelli kayıt: kişisel veri içermez; kaydı oluşturan satırın tablosu ve numarası. */
export interface ImportRollbackBlockedItemDto {
    entity: ImportRollbackEntity;
    id: string;
    table: ImportTable;
    rowNumber: number;
    reasons: string[];
}

/** `GET .../rollback-preview` (B5, §7.11). */
export interface ImportRollbackPreviewDto {
    status: ImportBatchStatus;
    canRollback: boolean;
    canDeleteUnblockedOnly: boolean;
    deletable: ImportRollbackCountsDto;
    blocked: ImportRollbackCountsDto;
    blockedItems: ImportRollbackBlockedItemDto[];
    blockedItemsTruncated: boolean;
    kept: { matchedClients: number; matchedPets: number };
    rolledBack: ImportRollbackCountsDto;
    remindersAlreadyReleased: boolean;
    warnings: string[];
}

/** `POST .../rollback` gövdesi (B5, §7.12). `reason` 1–500 karakter. */
export interface ImportRollbackRequestDto {
    requestId: string;
    reason: string;
    blockedPolicy: ImportBlockedPolicy;
}
