import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Doğrudan satış — `docs/DIRECT_SALE_API_CONTRACT.md` §6; `Sales.Validation` ve `Sales.InsufficientStock` backend `detail` ile gösterilir (kullanılabilir/süresi geçmiş miktarı söyler). */
export const SALE_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
    'Sales.NotFound': 'Satış kaydı bulunamadı.',
    'Sales.ClinicScopeRequired': 'Satışları görmek için önce bir klinik seçmelisiniz.',
    'Sales.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Sales.RequestIdRequired': 'İstek kimliği eksik. Sayfayı yenileyip tekrar deneyin.',
    'Sales.ProductInactive': 'Pasif ürün satılamaz. Ürünü sepetten çıkarın.',
    'Sales.VaccineNotSellable': 'Aşı ürünü satılamaz; aşı yalnızca hekim uygulamasıyla kaydedilir.',
    'Sales.ControlledSubstanceNotSellable': 'Narkotik ve psikotropik ürün satılamaz.',
    'Sales.BatchExpired': 'Seçilen partinin son kullanma tarihi geçmiş; süresi geçmiş partiden satış yapılamaz.',
    'Sales.WalkInPaymentRequired': 'Müşteri seçilmediğinde (Peşin müşteri) ödeme zorunludur.',
    'Sales.WalkInPaymentMustBeFull': 'Peşin müşteri satışında ödeme satış toplamına eşit olmalıdır.',
    'Sales.PaymentExceedsTotal': 'Ödeme tutarı satış toplamını aşamaz.',
    'Sales.DuplicateRequestId': 'Bu sepet daha önce gönderilmiş olabilir. Satış listesini kontrol edin; yoksa sepeti yeniden oluşturun.',
    'Sales.RequestIdVoided': 'Bu satış iptal edilmişti. Sepeti yeniden gönderin.',
    'Sales.AlreadyVoided': 'Bu satış zaten iptal edilmiş. Sayfayı yenileyin.',
    'Sales.ConcurrencyConflict': 'Kayıt aynı anda başka bir işlemle değişti. Tekrar deneyin.',
    'StockBatches.NotFound': 'Seçilen parti bulunamadı. Partiyi yeniden seçin.',
    'Clients.WalkInReadOnly': 'Peşin müşteri kaydı düzenlenemez.',
    'Products.NotFound': 'Ürün bulunamadı.',
    'Clients.NotFound': 'Müşteri kaydı bulunamadı.',
    'StockMovements.ConcurrencyConflict': 'Stok aynı anda başka bir işlemle değişti. Tekrar deneyin; aynı satış iki kez yazılmaz.'
};
