import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Lab istem/sonuç durumu —`docs/LAB_RESULT_STATUS_API_CONTRACT.md` §5; `LabResults.Validation` backend `detail` ile gösterilir. */
export const LAB_RESULT_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
    'LabResults.ConcurrencyConflict': 'Bu lab kaydı siz düzenlerken başka biri tarafından güncellendi.',
    'LabResults.AlreadyCancelled': 'Bu lab kaydı zaten iptal edilmiş. Sayfayı yenileyin.',
    'LabResults.VisitPetMismatch': 'Geliş kaydı seçilen hastayla uyuşmuyor.',
    'LabResults.VisitClinicMismatch': 'Geliş kaydı aktif klinikte değil.',
    'LabResults.ExaminationVisitMismatch': 'Muayene, geliş kaydına bağlı değil.'
};
