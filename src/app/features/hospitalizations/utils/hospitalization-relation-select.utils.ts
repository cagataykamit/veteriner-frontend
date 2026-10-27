import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import { prescriptionExaminationSelectOption } from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';

export interface HospitalizationRelationOption extends SelectOption {
    disabled?: boolean;
}

/** Kesinleşmiş muayeneye yatış bağlanamaz (`Examinations.Finalized`); seçenek açıklamayla pasif gösterilir. */
export const FINALIZED_EXAMINATION_OPTION_HINT = 'kesinleşmiş — yatış bağlanamaz';

export function hospitalizationExaminationOption(ex: ExaminationListItemVm): HospitalizationRelationOption {
    const base = prescriptionExaminationSelectOption(ex);

    return ex.status === 'Finalized' ? { ...base, label: `${base.label} (${FINALIZED_EXAMINATION_OPTION_HINT})`, disabled: true } : base;
}

/**
 * Seçili hayvanın bugünkü (yanlış işaretlenmemiş) gelişleri. Düzenlemede kayıtlı geliş bugünden değilse
 * seçenek olarak korunur; bağ yalnız değiştirilebilir, temizlenemez (sözleşme §2).
 */
export function hospitalizationVisitOptions(items: TodayItemVm[], petId: string, currentVisitId = ''): SelectOption[] {
    const options = items
        .filter((i) => i.visitId && !i.isVoided && i.petId === petId)
        .map((i) => ({
            value: i.visitId as string,
            label: `${i.petName} — ${formatUtcIsoAsLocalTimeDisplay(i.arrivedAtUtc)} gelişi`
        }));
    const current = currentVisitId.trim();

    return current && !options.some((o) => o.value === current) ? [{ value: current, label: 'Kayıtlı geliş bağı' }, ...options] : options;
}
