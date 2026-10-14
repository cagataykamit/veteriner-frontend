import { HttpErrorResponse } from '@angular/common/http';
import type { ImportBatchStatus, ImportIssueSeverity, ImportRollbackBlockedItemDto, ImportRollbackEntity, ImportTable, ImportValueKind } from '@/app/features/imports/models/import-api.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export const IMPORT_STATUS_LABELS: Readonly<Record<ImportBatchStatus, string>> = {
    Uploaded: 'Yüklendi',
    Mapped: 'Eşlendi',
    Validating: 'Doğrulanıyor',
    Validated: 'Doğrulandı',
    ValidationFailed: 'Doğrulama başarısız',
    Committing: 'Aktarılıyor',
    Committed: 'Aktarıldı',
    CommitFailed: 'Aktarma başarısız',
    RollingBack: 'Geri alınıyor',
    RolledBack: 'Geri alındı',
    PartiallyRolledBack: 'Kısmen geri alındı',
    RollbackFailed: 'Geri alma başarısız',
    Discarded: 'Silindi',
    Expired: 'Süresi doldu'
};

const STATUS_SEVERITY: Readonly<Record<ImportBatchStatus, StatusTagSeverity>> = {
    Uploaded: 'secondary',
    Mapped: 'secondary',
    Validating: 'info',
    Validated: 'info',
    ValidationFailed: 'danger',
    Committing: 'info',
    Committed: 'success',
    CommitFailed: 'danger',
    RollingBack: 'info',
    RolledBack: 'secondary',
    PartiallyRolledBack: 'warn',
    RollbackFailed: 'danger',
    Discarded: 'secondary',
    Expired: 'secondary'
};

export function importStatusLabel(status: string): string {
    return IMPORT_STATUS_LABELS[status as ImportBatchStatus] ?? status;
}

export function importStatusSeverity(status: string): StatusTagSeverity {
    return STATUS_SEVERITY[status as ImportBatchStatus] ?? 'secondary';
}

/** Silinebilen taslak durumları (sözleşme 7.13). */
const DRAFT_STATUSES: readonly string[] = ['Uploaded', 'Mapped', 'Validated', 'ValidationFailed'];

export function isDiscardable(status: string): boolean {
    return DRAFT_STATUSES.includes(status);
}

/** Doğrulaması bitmiş partide önizleme uçları açıktır (sözleşme 7.6). */
export function isPreviewable(status: string): boolean {
    return ['Validated', 'ValidationFailed', 'Committing', 'Committed', 'CommitFailed', 'RollingBack', 'RolledBack', 'PartiallyRolledBack', 'RollbackFailed'].includes(status);
}

/** Geri alınabilir durumlar (sözleşme 7.12): yeni geri alma bu durumlardan başlatılır. */
const ROLLBACKABLE_STATUSES: readonly string[] = ['Committed', 'CommitFailed', 'PartiallyRolledBack', 'RollbackFailed'];

export function isRollbackable(status: string): boolean {
    return ROLLBACKABLE_STATUSES.includes(status);
}

/** Geri alma ekranı: geri alınabilir durumlar ve süren geri alma. */
export function isRollbackScreenAvailable(status: string): boolean {
    return isRollbackable(status) || status === 'RollingBack';
}

export const IMPORT_VALUE_KIND_LABELS: Readonly<Record<ImportValueKind, string>> = {
    species: 'Tür',
    breed: 'Irk',
    vaccine: 'Aşı',
    color: 'Renk'
};

export const IMPORT_SEVERITY_LABELS: Readonly<Record<ImportIssueSeverity, string>> = {
    Info: 'Bilgi',
    Warning: 'Uyarı',
    Error: 'Hata'
};

export function importSeverityTag(severity: string): StatusTagSeverity {
    return severity === 'Error' ? 'danger' : severity === 'Warning' ? 'warn' : 'info';
}

/** Satır sorunu ve dosya düzeyi neden kodları için sade Türkçe etiketler (sözleşme 6.4). */
const ISSUE_LABELS: Readonly<Record<string, string>> = {
    'Imports.RequiredMissing': 'Zorunlu alan boş',
    'Imports.NameTooShort': 'Ad çok kısa',
    'Imports.FieldTooLong': 'Alan çok uzun',
    'Imports.PhoneInvalid': 'Telefon geçerli değil; telefonsuz aktarılır',
    'Imports.EmailInvalid': 'E-posta geçerli değil; e-postasız aktarılır',
    'Imports.DateInvalid': 'Tarih okunamadı',
    'Imports.DateFormatAmbiguous': 'Tarih biçimi belirsiz (gg.aa.yyyy kullanın)',
    'Imports.DateOutOfRange': 'Tarih kabul edilen aralığın dışında',
    'Pets.BirthDateInFuture': 'Doğum tarihi gelecekte',
    'Imports.BirthDateImplausible': 'Doğum tarihi çok eski',
    'Vaccinations.AppliedAtMustNotBeFuture': 'Uygulama tarihi gelecekte',
    'Vaccinations.DueAtMustBeAfterAppliedAt': 'Sonraki aşı tarihi uygulama tarihinden sonra olmalı',
    'Vaccinations.DueTooFarInFuture': 'Sonraki aşı tarihi 5 yıldan uzak',
    'Imports.AppliedBeforeBirth': 'Aşı, doğum tarihinden önce görünüyor',
    'Imports.MicrochipInvalid': 'Mikroçip numarası geçersiz',
    'Imports.MicrochipScientificNotation': 'Mikroçip bilimsel gösterimde (hücreyi metin yapın)',
    'Imports.MicrochipLength': 'Mikroçip 15 haneli değil',
    'Imports.MicrochipConflict': 'Aynı mikroçip başka bir hastada var',
    'Imports.SpeciesUnmapped': 'Tür sistemde bulunamadı',
    'Imports.VaccineUnmapped': 'Aşı adı sistemde bulunamadı',
    'Imports.ValueSkipped': 'Değer bilinçli olarak atlandı',
    'Imports.ParentSkipped': 'Bağlı olduğu satır atlandığı için atlandı',
    'Imports.BreedFreeText': 'Irk sistemde yok; metin olarak aktarılır',
    'Imports.ColorFreeText': 'Renk sistemde yok; nota eklenir',
    'Pets.BreedSpeciesMismatch': 'Seçilen ırk bu türe ait değil',
    'VaccineDefinitions.InvalidSpecies': 'Seçilen aşı bu türe uygun değil',
    'Imports.GenderUnrecognized': 'Cinsiyet tanınmadı',
    'Imports.NeuteredUnrecognized': 'Kısır değeri tanınmadı',
    'Imports.WeightInvalid': 'Ağırlık geçersiz; boş aktarılır',
    'Imports.DuplicateReference': 'Müşteri veya hasta numarası dosyada tekrar ediyor',
    'Imports.DuplicateInFile': 'Dosyada aynı kayıt daha önce geçiyor',
    'Imports.DuplicateClient': 'Aynı müşteri sistemde zaten var',
    'Imports.MatchedExisting': 'Sistemdeki kayıtla eşleşti',
    'Imports.SharedPhone': 'Telefon başka bir müşteriyle ortak',
    'Imports.PossibleDuplicate': 'Aynı adlı müşteri zaten var; ayrı kayıt oluşur',
    'Imports.OwnerNotFound': 'Hastanın sahibi bulunamadı',
    'Imports.OwnerRowInvalid': 'Sahip satırı hatalı olduğu için aktarılamaz',
    'Imports.PetNotFound': 'Aşının hastası bulunamadı',
    'Imports.PetRowInvalid': 'Hasta satırı hatalı olduğu için aktarılamaz',
    'Imports.DuplicateVaccination': 'Aynı aşı zaten kayıtlı; atlanır',
    'Imports.OwnerLinkUnavailable': 'Hastalar müşterilere bağlanamıyor (müşteri tablosu veya müşteri no eksik)',
    'Imports.PetLinkUnavailable': 'Aşılar hastalara bağlanamıyor (hasta tablosu veya hasta no eksik)',
    'Imports.NoImportableRows': 'Aktarılabilecek geçerli satır yok',
    'Imports.OwnerUnitFailed': 'Aynı müşterinin başka bir satırı aktarılamadığı için bu satır da aktarılmadı',
    'Imports.MatchedAtCommit': 'Aktarma sırasında sistemde aynı kayıt bulundu; yeni kayıt açılmadı, mevcutla eşleşti',
    'Imports.ApplyFailed': 'Kayıt yazılırken bir çakışma oluştu; satır aktarılamadı'
};

export function importIssueLabel(code: string, fallback?: string): string {
    return ISSUE_LABELS[code] ?? fallback ?? code;
}

const PROBLEM_MESSAGES: Readonly<Record<string, string>> = {
    'Imports.UnsupportedFile': 'Dosya biçimi desteklenmiyor. Şablondaki .xlsx veya .csv dosyasını kullanın.',
    'Imports.FileTooLarge': 'Dosya çok büyük (en fazla 10 MB).',
    'Imports.TooManyRows': 'Dosyada çok fazla satır var (tabloda en fazla 10.000, toplamda 25.000).',
    'Imports.EmptyFile': 'Dosya boş veya içinde okunacak veri yok.',
    'Imports.ClinicRequired': 'Aşı kayıtları için klinik seçmelisiniz.',
    'Imports.MappingIncomplete': 'Zorunlu alanlar eşlenmemiş. Eşlemeyi tamamlayın.',
    'Imports.MappingUnknownColumn': 'Eşlemede dosyada olmayan bir sütun var. Sayfayı yenileyip tekrar deneyin.',
    'Imports.MappingSourceReused': 'Aynı sütun iki alana eşlenemez.',
    'Imports.ValueMappingTargetInvalid': 'Seçtiğiniz karşılık kullanılamıyor (pasif veya uyumsuz). Başka bir karşılık seçin.',
    'Imports.BatchNotFound': 'İçe aktarma kaydı bulunamadı.',
    'Imports.DuplicateFile': 'Bu dosya daha önce yüklenmiş.',
    'Imports.RequestIdConflict': 'Bu yükleme farklı bilgilerle daha önce başlatılmış. Sayfayı yenileyip tekrar deneyin.',
    'Imports.AnotherJobRunning': 'Şu anda başka bir içe aktarma işlemi sürüyor. Bitmesini bekleyin.',
    'Imports.PayloadPurged': 'Satır verisi saklama süresi sonunda silindi.',
    'Imports.InvalidState': 'Bu işlem içe aktarmanın şu anki durumunda yapılamaz. Sayfayı yenileyin.',
    'Imports.ConcurrencyConflict': 'Kayıt aynı anda başka bir yerde değişti. Sayfayı yenileyip tekrar deneyin.',
    'Imports.TooManyOpenDrafts': 'En fazla 5 açık taslak olabilir. Eski bir taslağı silin veya tamamlayın.',
    'Imports.ClinicContextMismatch': 'Seçilen klinik, çalıştığınız klinikle uyuşmuyor.',
    'Imports.ValidationStale': 'Doğrulama sonucu eskidi. Yeniden doğrulayın.',
    'Imports.HasErrorRows': 'Hatalı satırlar var; bu seçenekle aktarılamaz.',
    'Imports.ReminderImpactChanged': 'E-posta sayısı değişti. Güncel sayıyı görüp tekrar onaylayın.',
    'Imports.CommitBlocked': 'Aktarma şu an başlatılamıyor. Doğrulama sonucundaki engelleri giderip yeniden doğrulayın.',
    'Imports.AccessDenied': 'Bu işlem için gerekli yetkiniz yok (müşteri, hasta veya aşı ekleme yetkisi). Yöneticinizle görüşün.',
    'Imports.RollbackBlocked': 'Bağlı kaydı olan kayıtlar var; hiçbir şey silinmedi. Aşağıdaki listeye bakın.'
};

/** Sayfada gösterilecek Türkçe hata; içe aktarma kodları önce, sonra genel panel eşlemesi. */
export function importErrorMessage(err: unknown, fallback: string): string {
    if (!(err instanceof HttpErrorResponse)) {
        return err instanceof Error && err.message ? err.message : fallback;
    }
    const code = problemCodeFromHttpError(err);
    return (code && PROBLEM_MESSAGES[code]) || messageFromHttpError(err, fallback);
}

/** Hata gövdesindeki problem kodu (örn. `Imports.DuplicateFile`). */
export function importErrorCode(err: unknown): string | null {
    return err instanceof HttpErrorResponse ? problemCodeFromHttpError(err) : null;
}

/** 409 `Imports.DuplicateFile` yanıtındaki mevcut parti kimliği (`extensions.batchId`). */
export function duplicateBatchId(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse) || problemCodeFromHttpError(err) !== 'Imports.DuplicateFile') {
        return null;
    }
    const body = err.error as Record<string, unknown> | null;
    const ext = body && typeof body === 'object' ? (body['extensions'] as Record<string, unknown> | undefined) : undefined;
    const id = ext?.['batchId'] ?? body?.['batchId'];
    return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/** Hata gövdesindeki ek alan (`extensions.<key>` ya da düz alan); yoksa undefined. Yalnız kod ve sayı gibi kişisel olmayan alanlar için. */
export function importErrorExtension(err: unknown, key: string): unknown {
    if (!(err instanceof HttpErrorResponse)) {
        return undefined;
    }
    const body = err.error as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
        return undefined;
    }
    const ext = body['extensions'];
    const fromExt = ext && typeof ext === 'object' ? (ext as Record<string, unknown>)[key] : undefined;
    return fromExt ?? body[key];
}

/** 409 `Imports.CommitBlocked` yanıtındaki engel kodları (`extensions.blockers`). */
export function importCommitBlockers(err: unknown): string[] {
    const v = importErrorExtension(err, 'blockers');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** 409 `Imports.ReminderImpactChanged` yanıtındaki güncel e-posta sayısı. */
export function reminderImpactCurrentCount(err: unknown): number | null {
    const v = importErrorExtension(err, 'emailsWithinReminderWindow');
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Uç dağıtılmamış ortamlarda yedek davranış (B4 sonrası yalnız bu durumda): yönlendirme bulunamadı (gövdesiz 404), 405 veya 501.
 * Gerçek "kayıt yok" yanıtı problem koduyla gelir (`Imports.BatchNotFound`) ve bu sayılmaz.
 */
export function isEndpointUnavailable(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) {
        return false;
    }
    if (err.status === 405 || err.status === 501) {
        return true;
    }
    return err.status === 404 && !problemCodeFromHttpError(err);
}

/** Geri alma engeli (`Kept`) neden kodları için sade Türkçe (sözleşme 9, B5 tablosu). */
const ROLLBACK_REASON_LABELS: Readonly<Record<string, string>> = {
    LinkedToExamination: 'Aşı bir muayeneye bağlanmış',
    HasAdministration: 'Aşıya bağlı uygulama kaydı var',
    VaccinationModified: 'Aşı sonradan düzenlenmiş',
    HasAppointments: 'Bağlı randevu var',
    HasVisits: 'Bağlı geliş (ziyaret) var',
    HasExaminations: 'Bağlı muayene var',
    HasTreatments: 'Bağlı tedavi var',
    HasPrescriptions: 'Bağlı reçete var',
    HasLabResults: 'Bağlı laboratuvar sonucu var',
    HasHospitalizations: 'Bağlı yatış var',
    HasAdministrations: 'Bağlı uygulama kaydı var',
    HasCharges: 'Bağlı ücret var',
    HasPayments: 'Bağlı ödeme var',
    HasSales: 'Bağlı satış var',
    HasCareInstructions: 'Bağlı bakım talimatı var',
    HasChargeSuggestions: 'Bağlı ücret önerisi var',
    HasOtherVaccinations: 'Elle ya da başka aktarmayla eklenmiş aşı var',
    HasKeptVaccinations: 'Aşılarından bazıları silinemediği için kalıyor',
    ClientModified: 'Müşteri sonradan düzenlenmiş',
    HasOtherPets: 'Başka yolla eklenmiş hastası var',
    HasKeptPets: 'Hastalarından bazıları silinemediği için kalıyor',
    OwnerUnitBlocked: 'Aynı müşterinin başka bir kaydı silinemediği için bırakıldı'
};

export function rollbackReasonLabel(code: string): string {
    return ROLLBACK_REASON_LABELS[code] ?? code;
}

export const ROLLBACK_ENTITY_LABELS: Readonly<Record<ImportRollbackEntity, string>> = {
    Client: 'Müşteri',
    Pet: 'Hasta',
    Vaccination: 'Aşı'
};

export const IMPORT_TABLE_LABELS: Readonly<Record<ImportTable, string>> = {
    customers: 'Müşteriler',
    pets: 'Hastalar',
    vaccinations: 'Aşılar'
};

/** Geri alma önizlemesi uyarıları (sözleşme 7.11). */
const ROLLBACK_WARNING_LABELS: Readonly<Record<string, string>> = {
    'Imports.PetEditsNotTracked': 'Hastalarda sonradan yapılan düzenlemeler izlenemiyor; aktarılan hastalar, sonradan düzenlenmiş olsalar bile silinir.',
    'Imports.RemindersAlreadyReleased': 'Aşı hatırlatmaları açılmış; gönderilmiş e-postalar geri alınamaz.'
};

export function rollbackWarningLabel(code: string): string {
    return ROLLBACK_WARNING_LABELS[code] ?? code;
}

/** 409 `Imports.RollbackBlocked` yanıtındaki engelli kayıtlar (`extensions.blockedItems`, en çok 50); yalnız kimlik/satır/neden alanları alınır. */
export function rollbackBlockedItems(err: unknown): ImportRollbackBlockedItemDto[] {
    const v = importErrorExtension(err, 'blockedItems');
    if (!Array.isArray(v)) {
        return [];
    }
    return v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => ({
            entity: x['entity'] as ImportRollbackEntity,
            id: String(x['id'] ?? ''),
            table: x['table'] as ImportTable,
            rowNumber: Number(x['rowNumber'] ?? 0),
            reasons: Array.isArray(x['reasons']) ? x['reasons'].filter((r): r is string => typeof r === 'string') : []
        }));
}

export const IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Yükleme öncesi ön kontrol; backend imzaya bakar, burada yalnız uzantı/boyut/boşluk denetlenir. Sorun yoksa `null`. */
export function precheckImportFile(file: File, extension: '.xlsx' | '.csv'): string | null {
    const name = file.name.toLowerCase();
    if (!name.endsWith(extension)) {
        return extension === '.xlsx' ? 'Yalnızca .xlsx dosyası yüklenebilir (.xls ve makrolu dosyalar desteklenmez).' : 'Yalnızca .csv dosyası yüklenebilir.';
    }
    if (file.size === 0) {
        return 'Dosya boş.';
    }
    if (file.size > IMPORT_MAX_FILE_BYTES) {
        return 'Dosya 10 MB sınırını aşıyor.';
    }
    return null;
}
