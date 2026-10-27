import type { HttpErrorResponse } from '@angular/common/http';
import { ADMINISTRATION_PANEL_PROBLEM_MESSAGES } from '@/app/entities/administration/utils/administration-error.utils';
import { problemCodeFromHttpError, problemMessageByCode, type ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Aşı oluşturma / güncelleme — `ProblemDetails` + `extensions.code`. */
export const VACCINATION_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
    'Vaccinations.ScheduledRequiresDueAt': 'Planlanan durumda planlanan uygulama tarihi zorunludur.',
    VaccinationsScheduledRequiresDueAt: 'Planlanan durumda planlanan uygulama tarihi zorunludur.',
    'Vaccinations.ScheduledDueAtMustNotBePast': 'Planlanan uygulama tarihi ve saati gelecekte olmalıdır.',
    VaccinationsScheduledDueAtMustNotBePast: 'Planlanan uygulama tarihi ve saati gelecekte olmalıdır.',
    'Vaccinations.AppliedAtMustNotBeFuture': 'Uygulama tarihi gelecek bir tarih olamaz.',
    VaccinationsAppliedAtMustNotBeFuture: 'Uygulama tarihi gelecek bir tarih olamaz.',
    'Vaccinations.DueAtMustBeAfterAppliedAt': 'Sonraki uygulama tarihi, uygulama tarihinden sonra olmalıdır.',
    VaccinationsDueAtMustBeAfterAppliedAt: 'Sonraki uygulama tarihi, uygulama tarihinden sonra olmalıdır.',
    'Vaccinations.ScheduledMustNotHaveAppliedAt': 'Planlanan kayıtta uygulama tarihi bulunmamalıdır.',
    VaccinationsScheduledMustNotHaveAppliedAt: 'Planlanan kayıtta uygulama tarihi bulunmamalıdır.',
    'VaccineDefinitions.NotFound': 'Seçilen aşı tanımı bulunamadı.',
    VaccineDefinitionsNotFound: 'Seçilen aşı tanımı bulunamadı.',
    'VaccineDefinitions.Inactive': 'Seçilen aşı tanımı aktif değil.',
    VaccineDefinitionsInactive: 'Seçilen aşı tanımı aktif değil.',
    'VaccineDefinitions.InvalidSpecies': 'Seçilen aşı tanımı bu hayvan türüyle uyumlu değil.',
    VaccineDefinitionsInvalidSpecies: 'Seçilen aşı tanımı bu hayvan türüyle uyumlu değil.',
    'VaccineDefinitions.CoreDefinitionCannotBeModified': 'Sistem tanımlı aşı kayıtları düzenlenemez.',
    VaccineDefinitionsCoreDefinitionCannotBeModified: 'Sistem tanımlı aşı kayıtları düzenlenemez.',
    'VaccineDefinitions.DuplicateCode': 'Bu aşı kodu zaten kullanılıyor.',
    VaccineDefinitionsDuplicateCode: 'Bu aşı kodu zaten kullanılıyor.',
    'Vaccinations.ProductRequiresAppliedStatus': 'Ürün seçilen aşıda durum "Uygulandı" olmalıdır. Stoktan düşmesini istemiyorsanız ürünü boş bırakın.',
    'Vaccinations.LinkedToAdministration':
        'Bu aşı stoktan düşen bir uygulamaya bağlı; yalnız not ve sonraki doz tarihi değişir. Aşıyı iptal etmek için bağlı uygulamayı iptal edin.',
    'Vaccinations.DuplicateRequestId': 'Bu istek kimliği farklı bir aşı için kullanılmış. Formu yeniden açıp tekrar deneyin.',
    'Vaccinations.ConcurrencyConflict': 'Aşı aynı anda başka bir işlemle kaydedildi. Tekrar deneyin; aynı kayıt iki kez düşülmez.',
    'Vaccinations.AdministrationForbidden': 'Stoktan düşen aşı kaydetme yetkiniz yok. Ürünü boş bırakıp yalnız aşı kaydı girin veya yöneticiye başvurun.'
};

/** Aşı + stok düşümü: aşı kodları ve uygulama (`Administrations.*`) kodları; kod eşleşmezse `null` (backend `detail` kullanılır). */
export function vaccinationStockProblemUserMessage(err: HttpErrorResponse): string | null {
    const code = problemCodeFromHttpError(err);

    return problemMessageByCode(code, VACCINATION_PANEL_PROBLEM_MESSAGES) ?? problemMessageByCode(code, ADMINISTRATION_PANEL_PROBLEM_MESSAGES);
}
