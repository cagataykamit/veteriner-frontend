import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Muayene kesinleştirme / ek not —`ProblemDetails` + `extensions.code` (`docs/EXAMINATION_FINALIZE_API_CONTRACT.md`). */
export const EXAMINATION_FINALIZE_PROBLEM_MESSAGES: ProblemMessages = {
    'Examinations.AlreadyFinalized': 'Bu muayene zaten kesinleştirilmiş. Sayfayı yenileyin.',
    'Examinations.ConcurrencyConflict':
        'Muayene siz ekranı açtıktan sonra başka biri tarafından değiştirilmiş. Sayfayı yenileyip içeriği kontrol ederek tekrar deneyin.',
    'Examinations.Finalized': 'Bu muayene kesinleştirilmiş; bağlı kayıt eklenemez veya değiştirilemez. Gerekirse muayeneye ek not ekleyin.',
    'Examinations.NotFinalized': 'Ek not yalnızca kesinleşmiş muayeneye eklenebilir.',
    'Examinations.ClinicContextMismatch': 'İşlem aktif klinik bağlamıyla uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'Examinations.NotFound': 'Muayene bulunamadı veya artık erişilemiyor.'
};
