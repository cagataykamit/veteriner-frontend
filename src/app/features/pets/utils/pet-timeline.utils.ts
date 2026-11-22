import type { PetTimelineItemVm, PetTimelineType } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { careStatusLabel } from '@/app/entities/visit/utils/visit-status.utils';
import type { VisitCareStatus } from '@/app/entities/visit/models/visit-vm.model';
import { formatDayMonthYearDisplay, formatWeekdayDisplay, parseUtcApiInstantIsoString, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
import { PET_TIMELINE_TYPES, type PetTimelineTypeDefinition } from '@/app/entities/pet/utils/pet-timeline-types';

/** Saat bilgisi taşımayan (yalnız tarihli) türler; satırda saat gösterilmez. */
const DATE_ONLY_TYPES: ReadonlySet<string> = new Set(['ImportedClinicalRecord']);

export function petTimelineIsDateOnly(type: string): boolean {
    return DATE_ONLY_TYPES.has(type);
}

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

/** Reçete veya uygulama bir tedaviye bağlıysa o tedavinin rotası (muayenesiz tedavide tek kaynak bağı budur). */
export function petTimelineTreatmentLink(item: PetTimelineItemVm): string[] | null {
    return item.relatedTreatmentId ? ['/panel/treatments', item.relatedTreatmentId] : null;
}

/** Randevulu geliş: randevu ayrı satır olmadığından randevuya bu bağlantıyla gidilir. */
export function petTimelineAppointmentLink(item: PetTimelineItemVm): string[] | null {
    return item.type === 'Visit' && item.relatedAppointmentId ? ['/panel/appointments', item.relatedAppointmentId] : null;
}

/**
 * Tür rengi: simge kutusu (`tile`, `text` ile birlikte) ve satırdaki tür etiketi (`text`); açık ve koyu tema.
 * Aktarılan kayıt ve bilinmeyen tür nötr gridir (aktarılan kaydın alt türü yalnız başlıkta yazar). Renk sınıflarının tek yeri burasıdır.
 */
export interface PetTimelineTypeTone {
    readonly text: string;
    readonly tile: string;
}

const NEUTRAL_TONE: PetTimelineTypeTone = { text: 'text-surface-500 dark:text-surface-400', tile: 'bg-surface-100 dark:bg-surface-800' };
const TREATMENT_TONE: PetTimelineTypeTone = { text: 'text-amber-700 dark:text-amber-300', tile: 'bg-amber-50 dark:bg-amber-400/15' };

const TYPE_TONES: Readonly<Record<string, PetTimelineTypeTone>> = {
    Visit: { text: 'text-surface-700 dark:text-surface-200', tile: 'bg-surface-100 dark:bg-surface-800' },
    Examination: { text: 'text-primary-700 dark:text-primary-300', tile: 'bg-primary-50 dark:bg-primary-400/15' },
    Treatment: TREATMENT_TONE,
    Prescription: TREATMENT_TONE,
    Administration: TREATMENT_TONE,
    LabResult: { text: 'text-violet-700 dark:text-violet-300', tile: 'bg-violet-50 dark:bg-violet-400/15' },
    Vaccination: { text: 'text-indigo-700 dark:text-indigo-300', tile: 'bg-indigo-50 dark:bg-indigo-400/15' },
    Hospitalization: { text: 'text-rose-700 dark:text-rose-300', tile: 'bg-rose-50 dark:bg-rose-400/15' },
    Imaging: { text: 'text-sky-700 dark:text-sky-300', tile: 'bg-sky-50 dark:bg-sky-400/15' },
    VitalMeasurement: { text: 'text-fuchsia-700 dark:text-fuchsia-300', tile: 'bg-fuchsia-50 dark:bg-fuchsia-400/15' },
    [PET_TIMELINE_PAYMENT_TYPE]: { text: 'text-green-700 dark:text-green-300', tile: 'bg-green-50 dark:bg-green-400/15' }
};

export function petTimelineTypeTone(type: string): PetTimelineTypeTone {
    return TYPE_TONES[type] ?? NEUTRAL_TONE;
}

/** Satırdaki tür etiketi: aktarılan kaydın türü başlıkta yazdığından etiket yalnız kaynağı söyler. */
export function petTimelineRowTypeLabel(type: string): string {
    return type === 'ImportedClinicalRecord' ? 'Eski programdan' : petTimelineTypeLabel(type);
}

/** Durum tonu: olağan sonuç soluk (`quiet`), bekleyen/süren dikkat (`warn`), iptal (`danger`). */
export type PetTimelineStatusTone = 'quiet' | 'warn' | 'danger';

export interface PetTimelineStatus {
    readonly label: string;
    readonly tone: PetTimelineStatusTone;
}

const STATUSES: Readonly<Record<string, PetTimelineStatus>> = {
    Active: { label: 'Yatışta', tone: 'warn' },
    Discharged: { label: 'Taburcu', tone: 'quiet' },
    Applied: { label: 'Uygulandı', tone: 'quiet' },
    Requested: { label: 'İstendi', tone: 'warn' },
    Resulted: { label: 'Sonuçlandı', tone: 'quiet' },
    Cancelled: { label: 'İptal', tone: 'danger' },
    Draft: { label: 'Taslak', tone: 'warn' },
    Finalized: { label: 'Kesinleşti', tone: 'quiet' }
};

const CARE_STATUS_TONES: Readonly<Record<string, PetTimelineStatusTone>> = { Waiting: 'warn', InProgress: 'warn', Completed: 'quiet' };

/** Bilinmeyen durum ham metin gösterilmez (null) — yanlış etiket yerine etiketsiz bırakılır. */
export function petTimelineStatus(item: PetTimelineItemVm): PetTimelineStatus | null {
    // Uygulamanın Active/Voided durumu yatışınkiyle karışmasın; iptal ortak "iptal" etiketiyle gösterilir.
    if (!item.status || item.type === 'Administration' || item.type === 'Imaging') {
        return null;
    }

    const careTone = item.type === 'Visit' ? CARE_STATUS_TONES[item.status] : undefined;

    if (careTone) {
        return { label: careStatusLabel(item.status as VisitCareStatus), tone: careTone };
    }

    return STATUSES[item.status] ?? null;
}

/** Aktif klinik bağlamı (oturumdan). */
export interface PetTimelineActiveClinic {
    readonly id: string | null;
    readonly name: string | null;
}

/**
 * Klinik adı yalnız kayıt aktif klinikten başka bir klinikteyse yazılır. Kimliği olmayan satır (geçmiş özetinden gelen ödeme)
 * adından karşılaştırılır; aktif klinik yoksa (kliniksiz oturum) ad her satırda görünür.
 */
export function petTimelineOtherClinicName(item: PetTimelineItemVm, active: PetTimelineActiveClinic): string | null {
    if (!item.clinicName) {
        return null;
    }

    const same =
        item.clinicId && active.id
            ? item.clinicId.toLowerCase() === active.id.toLowerCase()
            : !!active.name && item.clinicName.toLocaleLowerCase('tr') === active.name.trim().toLocaleLowerCase('tr');

    return same ? null : item.clinicName;
}

/** Aynı İstanbul gününün kayıtları; liste yeniden eskiye sıralı geldiğinden gün sırası korunur. */
export interface PetTimelineDayGroup {
    /** `yyyy-MM-dd` (İstanbul); tarihsiz kayıtlarda boş. */
    readonly key: string;
    /** "20 Kasım 2026" */
    readonly title: string;
    /** "Cuma · 2 gün önce" */
    readonly detail: string;
    readonly items: PetTimelineItemVm[];
}

const DAY_MS = 24 * 60 * 60_000;

export function groupPetTimelineByDay(items: readonly PetTimelineItemVm[], now: Date = new Date()): PetTimelineDayGroup[] {
    const today = toIstanbulDateInputValue(now.toISOString());
    const days = new Map<string, PetTimelineItemVm[]>();

    for (const item of items) {
        const key = toIstanbulDateInputValue(item.eventAtUtc);
        const list = days.get(key);

        if (list) {
            list.push(item);
        } else {
            days.set(key, [item]);
        }
    }

    return [...days].map(([key, list]) => {
        const at = list[0].eventAtUtc;

        return {
            key,
            title: key ? formatDayMonthYearDisplay(at) : 'Tarihsiz',
            detail: key ? `${formatWeekdayDisplay(at)} · ${relativeDayLabel(key, today)}` : '',
            items: list
        };
    });
}

/** Günün bugüne uzaklığı: "bugün", "dün", "5 gün önce", "3 hafta önce", "4 ay önce", "2 yıl önce". */
function relativeDayLabel(day: string, today: string): string {
    const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS);

    if (days < 0) {
        return days === -1 ? 'yarın' : `${-days} gün sonra`;
    }

    if (days <= 1) {
        return days === 0 ? 'bugün' : 'dün';
    }

    if (days < 14) {
        return `${days} gün önce`;
    }

    if (days < 60) {
        return `${Math.floor(days / 7)} hafta önce`;
    }

    return days < 365 ? `${Math.floor(days / 30)} ay önce` : `${Math.floor(days / 365)} yıl önce`;
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
    { value: 'examination', label: 'Muayene', types: ['Examination', 'ImportedClinicalRecord'] },
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
        // Geçmiş özetinin ödeme satırı klinik kimliği taşımaz; aktif klinikle adından karşılaştırılır.
        clinicId: null,
        clinicName: p.clinicName,
        title,
        summary: methodLabel,
        status: null,
        isVoided: false,
        linkType: PET_TIMELINE_PAYMENT_TYPE,
        linkId: p.id,
        relatedExaminationId: null,
        relatedAppointmentId: null,
        relatedTreatmentId: null,
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
