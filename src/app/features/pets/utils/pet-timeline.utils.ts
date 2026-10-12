import type { PetTimelineItemVm, PetTimelineType } from '@/app/features/pets/models/pet-timeline-vm.model';
import { careStatusLabel } from '@/app/features/visits/utils/visit-status.utils';
import type { VisitCareStatus } from '@/app/features/visits/models/visit-vm.model';

interface PetTimelineTypeDefinition {
    readonly value: PetTimelineType;
    readonly label: string;
    readonly icon: string;
    /** Kaynak kaydın detay sayfası; `null` → bu tür için detay sayfası yok. */
    readonly detailPath: string | null;
}

/** Sıra, filtre seçeneklerinin sırasıdır. Visit için detay sayfası yoktur (Bugün listesi günlüktür). */
export const PET_TIMELINE_TYPES: ReadonlyArray<PetTimelineTypeDefinition> = [
    { value: 'Visit', label: 'Geliş', icon: 'pi-sign-in', detailPath: null },
    { value: 'Examination', label: 'Muayene', icon: 'pi-file-edit', detailPath: '/panel/examinations' },
    { value: 'Treatment', label: 'Tedavi', icon: 'pi-wrench', detailPath: '/panel/treatments' },
    { value: 'Prescription', label: 'Reçete', icon: 'pi-file', detailPath: '/panel/prescriptions' },
    { value: 'LabResult', label: 'Laboratuvar', icon: 'pi-chart-bar', detailPath: '/panel/lab-results' },
    { value: 'Vaccination', label: 'Aşı', icon: 'pi-shield', detailPath: '/panel/vaccinations' },
    { value: 'Hospitalization', label: 'Yatış', icon: 'pi-building', detailPath: '/panel/hospitalizations' }
];

const BY_TYPE: ReadonlyMap<string, PetTimelineTypeDefinition> = new Map(PET_TIMELINE_TYPES.map((d) => [d.value, d]));

const FALLBACK_ICON = 'pi-circle';

/** Backend'e sonradan eklenen (ör. `Payment`) türler bozulmadan genel simgeyle ve türün adıyla görünür. */
export function petTimelineTypeLabel(type: string): string {
    return BY_TYPE.get(type)?.label ?? type;
}

export function petTimelineTypeIcon(type: string): string {
    return BY_TYPE.get(type)?.icon ?? FALLBACK_ICON;
}

/** Olayın kaynak kaydına giden rota; detay sayfası olmayan türde `null`. */
export function petTimelineEventLink(item: PetTimelineItemVm): string[] | null {
    const path = BY_TYPE.get(item.linkType)?.detailPath;
    return path ? [path, item.linkId] : null;
}

/** Olay bir muayeneye bağlıysa (tedavi, reçete, lab, aşı, yatış; geliş için en yeni bağlı muayene) o muayenenin rotası. */
export function petTimelineExaminationLink(item: PetTimelineItemVm): string[] | null {
    return item.type !== 'Examination' && item.relatedExaminationId ? ['/panel/examinations', item.relatedExaminationId] : null;
}

const STATUS_LABELS: Record<string, string> = {
    Active: 'Yatışta',
    Discharged: 'Taburcu',
    Applied: 'Uygulandı',
    Cancelled: 'İptal',
    Draft: 'Taslak',
    Finalized: 'Kesinleşti'
};

const CARE_STATUSES: ReadonlySet<string> = new Set(['Waiting', 'InProgress', 'Completed']);

/** Bilinmeyen durum ham metin gösterilmez (null) — yanlış etiket yerine etiketsiz bırakılır. */
export function petTimelineStatusLabel(item: PetTimelineItemVm): string | null {
    if (!item.status) {
        return null;
    }
    if (item.type === 'Visit' && CARE_STATUSES.has(item.status)) {
        return careStatusLabel(item.status as VisitCareStatus);
    }
    return STATUS_LABELS[item.status] ?? null;
}

/** İptal edilmiş aşı ve yanlış işaretli geliş ortak etiketi. */
export const PET_TIMELINE_VOIDED_LABEL = 'İptal / yanlış işaretli';

/** Yetki yok nedeniyle gösterilmeyen türlerin okunabilir listesi. */
export function petTimelineOmittedTypesLabel(types: readonly string[]): string {
    return types.map(petTimelineTypeLabel).join(', ');
}
