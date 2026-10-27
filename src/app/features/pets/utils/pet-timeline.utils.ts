import type { PetTimelineItemVm, PetTimelineType } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { careStatusLabel } from '@/app/features/visits/utils/visit-status.utils';
import type { VisitCareStatus } from '@/app/features/visits/models/visit-vm.model';
import { parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';

interface PetTimelineTypeDefinition {
    readonly value: PetTimelineType;
    readonly label: string;
    readonly icon: string;
    /** Kaynak kaydın detay sayfası; `null` → bu tür için detay sayfası yok. */
    readonly detailPath: string | null;
}

/** Sıra, filtre seçeneklerinin sırasıdır. Visit için detay sayfası yoktur (Bugün listesi günlüktür); Administration için de yoktur (kayıt muayene/tedavi sayfasındaki bölümde görünür). */
export const PET_TIMELINE_TYPES: ReadonlyArray<PetTimelineTypeDefinition> = [
    { value: 'Visit', label: 'Geliş', icon: 'pi-sign-in', detailPath: null },
    { value: 'Examination', label: 'Muayene', icon: 'pi-file-edit', detailPath: '/panel/examinations' },
    { value: 'Treatment', label: 'Tedavi', icon: 'pi-wrench', detailPath: '/panel/treatments' },
    { value: 'Prescription', label: 'Reçete', icon: 'pi-file', detailPath: '/panel/prescriptions' },
    { value: 'LabResult', label: 'Laboratuvar', icon: 'pi-chart-bar', detailPath: '/panel/lab-results' },
    { value: 'Vaccination', label: 'Aşı', icon: 'pi-shield', detailPath: '/panel/vaccinations' },
    { value: 'Hospitalization', label: 'Yatış', icon: 'pi-building', detailPath: '/panel/hospitalizations' },
    { value: 'Administration', label: 'Uygulama', icon: 'pi-box', detailPath: null },
    { value: 'Imaging', label: 'Görüntüleme', icon: 'pi-image', detailPath: '/panel/imaging' }
];

/** Timeline ucu ödemeyi henüz döndürmez (`types=Payment` → 400); hasta kartında geçmiş özetindeki ödemeler bu türle aynı listeye karışır. */
export const PET_TIMELINE_PAYMENT_TYPE = 'Payment';

type TypeDisplay = Omit<PetTimelineTypeDefinition, 'value'>;

const BY_TYPE: ReadonlyMap<string, TypeDisplay> = new Map<string, TypeDisplay>([
    ...PET_TIMELINE_TYPES.map((d): [string, TypeDisplay] => [d.value, d]),
    [PET_TIMELINE_PAYMENT_TYPE, { label: 'Ödeme', icon: 'pi-wallet', detailPath: '/panel/payments' }]
]);

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
    Requested: 'İstendi',
    Resulted: 'Sonuçlandı',
    Cancelled: 'İptal',
    Draft: 'Taslak',
    Finalized: 'Kesinleşti'
};

const CARE_STATUSES: ReadonlySet<string> = new Set(['Waiting', 'InProgress', 'Completed']);

/** Bilinmeyen durum ham metin gösterilmez (null) — yanlış etiket yerine etiketsiz bırakılır. */
export function petTimelineStatusLabel(item: PetTimelineItemVm): string | null {
    // Uygulamanın Active/Voided durumu yatışınkiyle karışmasın; iptal ortak "iptal" etiketiyle gösterilir.
    if (!item.status || item.type === 'Administration' || item.type === 'Imaging') {
        return null;
    }

    if (item.type === 'Visit' && CARE_STATUSES.has(item.status)) {
        return careStatusLabel(item.status as VisitCareStatus);
    }

    return STATUS_LABELS[item.status] ?? null;
}

/** İptal edilmiş aşı ve yanlış işaretli geliş ortak etiketi. */
export const PET_TIMELINE_VOIDED_LABEL = 'İptal / yanlış işaretli';

export type PetCardTimelineFilter = 'all' | 'examination' | 'vaccination' | 'lab' | 'imaging' | 'treatment' | 'payment';

interface PetCardTimelineFilterDefinition {
    readonly value: PetCardTimelineFilter;
    readonly label: string;
    /** Timeline ucuna giden türler; boş = yetkili tüm türler. `payment` uca gitmez (geçmiş özetinden gelir). */
    readonly types: readonly PetTimelineType[];
}

/** Hasta kartındaki tek zaman çizelgesinin süzgeçleri (ADR-020 karar 2d); sıra ekrandaki sıradır. */
export const PET_CARD_TIMELINE_FILTERS: ReadonlyArray<PetCardTimelineFilterDefinition> = [
    { value: 'all', label: 'Tümü', types: [] },
    { value: 'examination', label: 'Muayene', types: ['Examination'] },
    { value: 'vaccination', label: 'Aşı', types: ['Vaccination'] },
    { value: 'lab', label: 'Lab', types: ['LabResult'] },
    { value: 'imaging', label: 'Görüntüleme', types: ['Imaging'] },
    { value: 'treatment', label: 'Tedavi', types: ['Treatment', 'Prescription', 'Administration'] },
    { value: 'payment', label: 'Ödeme', types: [] }
];

/** Geçmiş özetindeki ödeme satırı timeline olayı olarak (başlık: tutar, özet: ödeme yöntemi). */
export function paymentToPetTimelineItem(
    p: { id: string; paidAtUtc: string | null; clinicName: string | null },
    title: string,
    methodLabel: string | null
): PetTimelineItemVm {
    return {
        key: `${PET_TIMELINE_PAYMENT_TYPE}:${p.id}`,
        type: PET_TIMELINE_PAYMENT_TYPE,
        sourceId: p.id,
        eventAtUtc: p.paidAtUtc,
        clinicName: p.clinicName,
        title,
        summary: methodLabel,
        status: null,
        isVoided: false,
        linkType: PET_TIMELINE_PAYMENT_TYPE,
        linkId: p.id,
        relatedExaminationId: null,
        addedAfterFinalization: false
    };
}

/**
 * İki yeniden-eskiye liste birleşir, en yeni `limit` olay kalır. Her liste en az `limit` olay (ya da tamamını) içerdiği sürece
 * sonuç kesindir: en yeni `limit` olayın hiçbiri listelerin dışında kalamaz.
 */
export function mergePetTimelineItems(a: readonly PetTimelineItemVm[], b: readonly PetTimelineItemVm[], limit: number): PetTimelineItemVm[] {
    const at = (i: PetTimelineItemVm) => parseUtcApiInstantIsoString(i.eventAtUtc)?.getTime() ?? 0;

    return [...a, ...b].sort((x, y) => at(y) - at(x)).slice(0, limit);
}

/** Yetki yok nedeniyle gösterilmeyen türlerin okunabilir listesi. */
export function petTimelineOmittedTypesLabel(types: readonly string[]): string {
    return types.map(petTimelineTypeLabel).join(', ');
}
