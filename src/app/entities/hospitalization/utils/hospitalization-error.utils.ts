import type { ProblemMessages } from '@/app/shared/utils/api-error.utils';

/** Yatış ve bakım talimatı — `docs/HOSPITALIZATION_MODEL_API_CONTRACT.md` §2, §4, §6, §8; `*.Validation` backend `detail` ile gösterilir. */
export const HOSPITALIZATION_PANEL_PROBLEM_MESSAGES: ProblemMessages = {
    'Hospitalizations.ConcurrencyConflict': 'Bu yatış kaydı siz düzenlerken başka biri tarafından güncellendi.',
    'Hospitalizations.ExaminationVisitMismatch': 'Seçilen geliş, bağlı muayenenin gelişiyle uyuşmuyor.',
    'Hospitalizations.VisitPetMismatch': 'Geliş kaydı seçilen hastayla uyuşmuyor.',
    'Hospitalizations.VisitClinicMismatch': 'Geliş kaydı aktif klinikte değil.',
    'CareInstructions.ConcurrencyConflict': 'Bu bakım talimatı siz düzenlerken başka biri tarafından güncellendi.',
    'CareInstructions.HospitalizationPetMismatch': 'Yatış seçilen hastayla uyuşmuyor.',
    'CareInstructions.HospitalizationClinicMismatch': 'Yatış aktif klinikte değil.',
    'CareInstructions.ExaminationPetMismatch': 'Muayene seçilen hastayla uyuşmuyor.',
    'CareInstructions.ExaminationClinicMismatch': 'Muayene aktif klinikte değil.',
    'CareInstructions.HospitalizationExaminationMismatch': 'Muayene, yatışın bağlı olduğu muayeneyle uyuşmuyor.',
    'CareInstructions.VisitMismatch': 'Geliş kaydı, yatışın gelişiyle uyuşmuyor.',
    'CareInstructions.ExaminationVisitMismatch': 'Geliş kaydı, muayenenin gelişiyle uyuşmuyor.',
    'Hospitalizations.NotFound': 'Yatış kaydı bulunamadı.',
    'CareInstructions.NotFound': 'Bakım talimatı bulunamadı.'
};
