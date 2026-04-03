import type { ExaminationDetailVm, ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { TreatmentDetailVm, TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

export function prescriptionExaminationSelectOption(ex: ExaminationListItemVm): SelectOption {
    const dt = formatDateTimeDisplay(ex.examinedAtUtc);
    const vr = (ex.visitReason ?? '').trim() || '—';
    const short = vr.length > 56 ? `${vr.slice(0, 53)}…` : vr;
    return { value: ex.id, label: `${dt} · ${short}` };
}

export function prescriptionTreatmentSelectOption(t: TreatmentListItemVm): SelectOption {
    const dt = formatDateTimeDisplay(t.treatmentDateUtc);
    const title = (t.title ?? '').trim() || '—';
    const short = title.length > 56 ? `${title.slice(0, 53)}…` : title;
    return { value: t.id, label: `${dt} · ${short}` };
}

/**
 * Muayene seçili değilken: hayvana ait tüm tedaviler.
 * Muayene seçiliyken: yalnızca bu muayeneye bağlı tedaviler (`examinationId` eşleşmeli; boş/null olanlar dahil edilmez).
 */
export function filterTreatmentsByExamination(
    treatments: TreatmentListItemVm[],
    examinationId: string | null | undefined
): TreatmentListItemVm[] {
    const ex = examinationId?.trim() ?? '';
    if (!ex) {
        return treatments;
    }
    return treatments.filter((t) => (t.examinationId?.trim() ?? '') === ex);
}

export function examinationListItemFromDetail(d: ExaminationDetailVm): ExaminationListItemVm {
    return {
        id: d.id,
        clinicId: d.clinicId,
        clinicName: d.clinicName,
        examinedAtUtc: d.examinedAtUtc,
        clientId: d.clientId,
        clientName: d.clientName,
        petId: d.petId,
        petName: d.petName,
        appointmentId: d.appointmentId,
        visitReason: d.visitReason
    };
}

export function treatmentListItemFromDetail(d: TreatmentDetailVm): TreatmentListItemVm {
    return {
        id: d.id,
        clinicId: d.clinicId,
        petId: d.petId,
        petName: d.petName,
        clientId: d.clientId,
        clientName: d.clientName,
        treatmentDateUtc: d.treatmentDateUtc,
        title: d.title,
        examinationId: d.examinationId,
        followUpDateUtc: d.followUpDateUtc
    };
}
