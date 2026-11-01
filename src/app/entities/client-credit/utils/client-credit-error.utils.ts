import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Müşteri kredisi uçları — `CLIENT_CREDIT_API_CONTRACT.md` §4–§6, §10; servis `toUserError` ile öncelikli tablo olarak verir. */
export const CLIENT_CREDIT_PROBLEM_MESSAGES: ProblemMessages = {
    'ClientCredits.Validation': 'Girilen bilgiler geçerli değil. Tutarları ve gerekçeyi (5–500 karakter) kontrol edin.',
    'ClientCredits.AllocationsRequired': 'Krediden kapatılacak en az bir ücrete tutar girin.',
    'ClientCredits.ChargeClinicMismatch': 'Ücret aktif klinikte değil; kredi yalnız aynı klinikteki ücretlere mahsup edilir.',
    'ClientCredits.ChargeClientMismatch': 'Ücret bu müşteriye ait değil.',
    'ClientCredits.InsufficientBalance': 'Müşterinin kullanılabilir kredisi seçilen tutara yetmiyor. Güncel tutarları kontrol edin.',
    'ClientCredits.ConcurrencyConflict': 'Kredi ya da ücret aynı anda değişti. Güncel tutarları kontrol edip tekrar deneyin.',
    'ClientCredits.NotFound': 'Kredi kaydı bulunamadı.',
    'ClientCredits.ApplicationNotFound': 'Mahsup kaydı bulunamadı.',
    'ClientCredits.ApplicationAlreadyReversed': 'Bu mahsup zaten geri alınmış. Listeyi yenileyin.',
    'ClientCredits.CreditClosed': 'Kredi iade ya da iptal edildiği için mahsup geri alınamaz.',
    'ClientCredits.NothingToRefund': 'Bu kredinin iade edilecek kalanı yok.',
    'PaymentAllocations.ExceedsOutstanding': 'Girilen tutar ücretin açık tutarını aşıyor. Güncel tutarları kontrol edin.',
    'Payments.CorrectionForbidden': 'Bu işlem için yetkiniz yok.',
    'Charges.NotFound': 'Ücret kaydı bulunamadı.',
    'Clients.NotFound': 'Müşteri kaydı bulunamadı.'
};
