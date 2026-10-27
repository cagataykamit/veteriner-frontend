import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Uygulama kaydı ve iptali — `docs/ADMINISTRATIONS_API_CONTRACT.md` §3–§6; `Administrations.Validation` backend `detail` ile gösterilir. */
export const ADMINISTRATION_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
    'Administrations.BatchExpired':
        'Partinin son kullanma tarihi geçmiş; süresi geçmiş partiyle uygulama kaydedilemez. Süresi geçmemiş bir parti seçin. Süresi geçmiş stok, stok çıkışı veya düzeltme ile (imha/sayım) düşülür.',
    'StockBatches.NotFound': 'Seçilen parti bulunamadı. Formu yeniden açıp partiyi tekrar seçin.',
    'Administrations.DuplicateRequestId': 'Bu istek kimliği farklı bir uygulama için kullanılmış. Formu yeniden açıp tekrar deneyin.',
    'Administrations.RequestIdVoided': 'Bu uygulama kaydı iptal edilmişti. Formu yeniden açıp tekrar deneyin.',
    'Administrations.AlreadyVoided': 'Bu uygulama zaten iptal edilmiş. Listeyi yenileyin.',
    'Administrations.LateEntryReasonRequired': 'Muayene kesinleşmiş; gerekçe (5–500 karakter) zorunludur. Uygulamayı muayene sayfasından ekleyin.',
    'Administrations.NotFound': 'Uygulama kaydı bulunamadı.',
    'Administrations.StockMovementNotFound': 'Uygulamanın stok hareketi bulunamadı; lütfen destek ile iletişime geçin.',
    'Administrations.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Administrations.ClinicScopeRequired': 'Uygulamaları görmek için önce bir klinik seçmelisiniz.',
    'Administrations.TreatmentClinicMismatch': 'Tedavi aktif klinikte değil.',
    'Administrations.TreatmentPetMismatch': 'Tedavi seçilen hastayla uyuşmuyor.',
    'Administrations.ExaminationClinicMismatch': 'Muayene aktif klinikte değil.',
    'Administrations.ExaminationPetMismatch': 'Muayene seçilen hastayla uyuşmuyor.',
    'Administrations.TreatmentExaminationMismatch': 'Tedavi, seçilen muayeneye bağlı değil.',
    'Treatments.DateTooFarInPast': 'Uygulama zamanı en fazla 7 gün öncesine kadar girilebilir.',
    'Treatments.DateTooFarInFuture': 'Uygulama zamanı en fazla 2 yıl ileriye girilebilir.',
    'Products.NotFound': 'Ürün bulunamadı.',
    'Products.Inactive': 'Bu ürün pasif; kullanılamaz. Başka bir ürün seçin veya ürünü aktifleştirin.',
    'Products.NotStockTracked': 'Hizmetler stok takipli değildir; uygulama, satış, reçete ve stok hareketinde kullanılamaz. Stoklu bir ürün seçin.',
    'Products.KindChangeNotAllowed': 'Ürün türü hizmete veya hizmetten değiştirilemez. Yanlış kaydı pasif yapıp doğru türde yeni kayıt açın.',
    'Administrations.ConcurrencyConflict': 'Uygulama aynı anda başka bir işlemle değişti (ör. ücrete çevrildi). Sayfayı yenileyip tekrar deneyin.',
    'StockMovements.ConcurrencyConflict': 'Stok aynı anda başka bir işlemle değişti. Tekrar deneyin; aynı kayıt iki kez düşülmez.'
};
