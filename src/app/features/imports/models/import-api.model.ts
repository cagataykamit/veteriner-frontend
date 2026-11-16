/** Veri içe aktarma sözleşmesi (Veteriner `docs/IMPORT_API_CONTRACT.md`, B1–B5, K13, bölüm 12 tam geçiş). JSON camelCase. */

/** Mantıksal tablolar; sıra doğrulama ve uygulama sırasıdır (§12.1). */
export type ImportTable = 'customers' | 'pets' | 'vaccinations' | 'clinicalRecords' | 'accountEntries' | 'appointments' | 'products';

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

/** `Profile`: seçilen kaynak programın hazır eşlemesi (TIER-021, §4.5); doğrulanmamış olabilir. */
export type ImportColumnConfidence = 'Exact' | 'Profile' | 'Alias' | 'None';

/** Kliniğin geldiği program (TIER-021, §4.5). */
export type ImportSourceProfileCode = 'Generic' | 'Kolayvet' | 'EVet';

/** Hazır eşlemenin bir satırı (§7.15). */
export interface ImportProfileMappingDto {
    table: ImportTable;
    header: string;
    field: string;
    source: string;
    verified: boolean;
}

/** GET `/imports/source-profiles` öğesi; `verified` yalnız tüm eşlemeler gerçek dosyayla denetlendiyse true. */
export interface ImportSourceProfileDto {
    code: ImportSourceProfileCode;
    displayName: string;
    note: string;
    verified: boolean;
    mappings: ImportProfileMappingDto[];
}
export type ImportIssueSeverity = 'Info' | 'Warning' | 'Error';
/** `pet`: ayırt edilemeyen hasta grubu (yalnız `unmappedValues`'ta; seçim `petChoices` ile, sözleşme 13.4). */
export type ImportValueKind = 'species' | 'breed' | 'vaccine' | 'color' | 'pet';
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

/** §12.2: tablo partide olmasa da her anahtar gelir (sayaçlar sıfır). */
export type ImportSummaryDto = Record<ImportTable, ImportTableSummaryDto>;

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

/** Dosya notunun etkisi (sözleşme 7.2.1); yoksa `info` sayılır. */
export type ImportWarningSeverity = 'decision' | 'attention' | 'info' | 'skipped';

export interface ImportWarningPartDto {
    label: string;
    count: number;
    severity?: ImportWarningSeverity | null;
}

/** `required`: Doğrulama adımında "Sizden beklenen"; `rows`: satır incelemesi (henüz üretilmiyor). */
export interface ImportWarningTargetDto {
    anchor: 'required' | 'rows';
    table?: ImportTable | null;
    reason?: string | null;
}

/** Dosya okunurken çıkan not. `message` her notta vardır; diğer alanlar yoksa not düz metin gösterilir. */
export interface ImportWarningDto {
    code: string;
    table?: ImportTable | null;
    message: string;
    severity?: ImportWarningSeverity | null;
    count?: number | null;
    unit?: string | null;
    title?: string | null;
    source?: string | null;
    parts?: ImportWarningPartDto[] | null;
    outcome?: string | null;
    example?: string | null;
    target?: ImportWarningTargetDto | null;
}

export interface ImportProgressDto {
    phase: string;
    processed: number;
    total: number;
}

/** Yükleme akışı: gönderim yüzdesi, ardından sunucunun oluşturduğu parti. */
export type ImportUploadEvent = { type: 'progress'; percent: number } | { type: 'done'; batch: ImportBatchDto };

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
    /** TIER-021; eski sunucu göndermezse `Generic` sayılır. */
    sourceProfile?: ImportSourceProfileCode;
    summary: ImportSummaryDto;
    /** B4: yoksa null/undefined. */
    progress?: ImportProgressDto | null;
    /** Listede null. */
    tables?: ImportTableInfoDto[] | null;
    /** Dosya notları: yükleme ve ayrıntı yanıtında (`tables` ile birlikte); listede ve bu alandan önce yüklenmiş partide null. */
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

/** Belirsiz hasta grubu seçimi (sözleşme 13.4): `petNo` null ise grubun kayıtları atlanır; `merge` adaylar tek hasta. */
export interface ImportPetChoiceDto {
    reference: string;
    petNo: string | null;
    merge: boolean;
}

export interface ImportMappingRequestDto {
    columns: Partial<Record<ImportTable, Record<string, string>>>;
    valueMappings: ImportValueMappingDto[];
    options: { onDuplicateClient: ImportDuplicateClientMode };
    petChoices?: ImportPetChoiceDto[];
}

/** Belirsiz grubun aday hastası; değerler dosyadaki yazımla. */
export interface ImportPetCandidateDto {
    petNo: string;
    rowNumber: number;
    name: string | null;
    ownerName: string | null;
    species: string | null;
    breed: string | null;
    color: string | null;
    gender: string | null;
    birthDate: string | null;
    status: string | null;
    registeredOn: string | null;
}

/** Belirsiz grubun kaydı (sözleşme 13.4; grup başına ilk birkaç satır): aşıda aşı adı, muayenede kayıt türü ve kısa özet. */
export interface ImportPetRowDto {
    reference: string;
    table: string;
    rowNumber: number;
    /** `yyyy-aa-gg` (dosyadaki yazımla). */
    date: string | null;
    title: string | null;
    summary: string | null;
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
    /** §12.6 randevu alanları; eski sunucuda yok. */
    futureAppointments?: number;
    appointmentEmailsWithinReminderWindow?: number;
    appointmentReminderWindowHours?: number;
    tenantAppointmentRemindersEnabled?: boolean;
    /** Aşı + randevu; `release-reminders` onayı bu sayıyla karşılaştırılır (yoksa `emailsWithinReminderWindow`). */
    totalEmailsWithinReminderWindow?: number;
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
    /** Tablo başına aktarılmayacak satırların nedeni (sözleşme 7.6, 2026-11-14); eski sunucu yanıtında yoktur. */
    notImportedReasons?: ImportNotImportedReasonDto[];
    /** Belirsiz hasta gruplarının adayları (sözleşme 13.4); eski sunucu yanıtında yoktur. */
    petCandidates?: ImportPetCandidateDto[];
    /** Belirsiz hasta gruplarının kayıtları (sözleşme 13.4, 2026-11-16); eski sunucu yanıtında yoktur. */
    petRows?: ImportPetRowDto[];
}

/** Aktarılmayacak satırın nedeni: `Skipped` bilerek atlanan, `Error` hatalı; satır başına bir neden sayılır. */
export interface ImportNotImportedReasonDto {
    table: ImportTable;
    kind: 'Skipped' | 'Error';
    code: string;
    rowCount: number;
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

/** Satır listesi durum filtresi; `WillSkip`: doğrulamada bilerek atlanacak satırlar (sözleşme 7.7). */
export type ImportRowStatusFilter = 'Valid' | 'Warning' | 'Error' | 'WillSkip';

export interface ImportRowsQuery {
    table?: ImportTable;
    status?: ImportRowStatusFilter;
    code?: string;
    page: number;
    pageSize: number;
}

export interface ImportCommitRequestDto {
    validationId: string;
    onErrors: ImportOnErrors;
}

/** Arka plan işi süren durumlar (§3): doğrulama (K13), uygulama (B4), geri alma (B5). */
export type ImportJobStatus = Extract<ImportBatchStatus, 'Validating' | 'Committing' | 'RollingBack'>;

/**
 * `GET .../progress` (§7.14): hafif yoklama yanıtı. `phase` iş sürerken durumla aynı adla dolu, aksi null.
 * `Validating` iken `processed` yazılmış doğrulama sonucu sayısıdır; kurallar bellekte çalışırken 0 kalabilir.
 */
export interface ImportCommitProgressDto {
    id: string;
    status: ImportBatchStatus;
    phase: ImportJobStatus | null;
    processed: number;
    total: number;
    updatedAtUtc: string | null;
    committedAtUtc: string | null;
    /** İş sürerken false: işçi bekleniyor / devralınacak; uzun sürerse işçi kapalı olabilir. */
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
export type ImportRollbackEntity = 'Client' | 'Pet' | 'Vaccination' | 'ClinicalRecord' | 'AccountEntry' | 'Appointment' | 'Product';

/** §12.9: yeni anahtarlar eski sunucuda yok; `openingBalances` devir ücretleridir (müşterinin eki, müşteriyle aynı kararı alır). */
export interface ImportRollbackCountsDto {
    clients: number;
    pets: number;
    vaccinations: number;
    clinicalRecords?: number;
    accountEntries?: number;
    appointments?: number;
    products?: number;
    openingBalances?: number;
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
    kept: { matchedClients: number; matchedPets: number; matchedProducts?: number };
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
