import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { parseAppointmentStatusRawToEnum } from '@/app/entities/appointment/utils/appointment-status.utils';
import type { VaccinationCalendarItemVm, CalendarItemState } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import type { CalendarBubbleData } from '@/app/features/appointments/components/calendar-bubble';

/**
 * Takvim aşı katmanı ve ayrıntı balonu (kullanıcı kararı 2026-11-16). Aşı randevu değildir: ayrı listede tutulur, ızgaranın saat dilimine,
 * çakışmaya ve boş saat hesabına girmez; günün üst şeridinde gösterilir.
 */

const FILTERS_KEY = 'vetinity.calendar.filters';

/** Son kullanılan filtreler kullanıcının tarayıcısında (aşı katmanı dahil); okunamazsa boş (tümü). */
export function readStoredCalendarFilters(): CalendarFilters {
    try {
        const raw = localStorage.getItem(FILTERS_KEY);

        return raw ? parseCalendarFilters(new URLSearchParams(raw)) : EMPTY_CALENDAR_FILTERS;
    } catch {
        return EMPTY_CALENDAR_FILTERS;
    }
}

export function writeStoredCalendarFilters(f: CalendarFilters): void {
    try {
        const q = new URLSearchParams(Object.entries(calendarFiltersToQueryParams(f)).filter((e): e is [string, string] => !!e[1]));

        localStorage.setItem(FILTERS_KEY, q.toString());
    } catch {
        // Depolama kapalıysa seçim yalnız adres çubuğunda kalır.
    }
}

/** Hekim filtresinde "Hekim atanmamış" değeri. */
export const NO_VET = 'none';
/** Tür filtresinde "Planlı aşılar" seçeneği (randevu türlerinin yanında ayrı seçenek). */
export const VACCINE_TYPE = 'asi';
/** Durum filtresi ve renk açıklaması sırası (sözleşme §6.1). */
export const CALENDAR_STATES: readonly CalendarItemState[] = ['DueToday', 'Upcoming', 'Overdue', 'Completed'];

/** Takvim filtreleri (sözleşme §6); adres çubuğunda `vet`, `types`, `states`. Boş değer = tümü. */
export interface CalendarFilters {
    /** Hekim kimliği ya da {@link NO_VET}; `null` tüm hekimler. */
    vet: string | null;
    /** Randevu türü sayıları (metin) ve/veya {@link VACCINE_TYPE}. */
    types: string[];
    states: CalendarItemState[];
}

export const EMPTY_CALENDAR_FILTERS: CalendarFilters = { vet: null, types: [], states: [] };

export function parseCalendarFilters(params: { get(name: string): string | null }): CalendarFilters {
    const list = (name: string) =>
        (params.get(name) ?? '')
            .split(',')
            .map((x) => x.trim())
            .filter((x) => !!x);

    return {
        vet: params.get('vet')?.trim() || null,
        types: list('types').filter((t) => t === VACCINE_TYPE || /^\d+$/.test(t)),
        states: CALENDAR_STATES.filter((s) => list('states').includes(s))
    };
}

/** Adres çubuğu parametreleri; boş filtre parametre yazmaz (`undefined` siler). */
export function calendarFiltersToQueryParams(f: CalendarFilters): Record<string, string | undefined> {
    return { vet: f.vet ?? undefined, types: f.types.length ? f.types.join(',') : undefined, states: f.states.length ? f.states.join(',') : undefined };
}

/**
 * Filtreden sunucu isteği: randevu türleri (sayı), hekim/hekimsiz, durumlar; aşı katmanı istenecek mi. Tür seçimi boşsa randevular ve
 * aşılar tümü; doluysa aşılar yalnız "Planlı aşılar" seçiliyse. Aşı kaydında hekim yoktur: belirli bir hekim seçiliyken
 * aşı istenmez ("hekim atanmamış" sayılır).
 */
export function calendarRequestFor(f: CalendarFilters) {
    const appointmentTypes = f.types.filter((t) => t !== VACCINE_TYPE).map(Number);

    return {
        appointments: f.types.length === 0 || appointmentTypes.length > 0,
        appointmentTypes,
        veterinarianUserId: f.vet && f.vet !== NO_VET ? f.vet : undefined,
        withoutVeterinarian: f.vet === NO_VET,
        states: f.states,
        vaccines: (f.types.length === 0 || f.types.includes(VACCINE_TYPE)) && (!f.vet || f.vet === NO_VET)
    };
}

/** Durum filtresi ve renk açıklaması (randevu ve aşı aynı dil). */
export function calendarStateLabel(state: CalendarItemState): string {
    switch (state) {
        case 'DueToday':
            return 'Bugün';
        case 'Overdue':
            return 'Gecikmiş';
        case 'Completed':
            return 'Tamamlanan';
        default:
            return 'Gelecek';
    }
}

/** Renkler (kullanıcı): bugün sarı, ileri tarih siyah/koyu (gri değil), gecikmiş kırmızı, uygulandı yeşil. */
export function vaccineChipClass(state: CalendarItemState): string {
    switch (state) {
        case 'DueToday':
            return 'bg-yellow-200 border-yellow-500 text-yellow-950 dark:bg-yellow-400 dark:border-yellow-300 dark:text-yellow-950';
        case 'Overdue':
            return 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950 dark:border-red-500 dark:text-red-300';
        case 'Completed':
            return 'bg-green-50 border-green-600 text-green-800 dark:bg-green-950 dark:border-green-500 dark:text-green-300';
        default:
            return 'bg-surface-0 border-surface-900 text-surface-900 dark:bg-surface-900 dark:border-surface-0 dark:text-surface-0';
    }
}

export function vaccineDotClass(state: CalendarItemState): string {
    switch (state) {
        case 'DueToday':
            return 'bg-yellow-400';
        case 'Overdue':
            return 'bg-red-500';
        case 'Completed':
            return 'bg-green-600';
        default:
            return 'bg-surface-900 dark:bg-surface-0';
    }
}

export function vaccineStateLabel(state: CalendarItemState): string {
    switch (state) {
        case 'DueToday':
            return 'Bugün yapılacak';
        case 'Overdue':
            return 'Gecikmiş, yapılmadı';
        case 'Completed':
            return 'Uygulandı';
        default:
            return 'Yapılacak';
    }
}

export function vaccinationBubble(item: VaccinationCalendarItemVm, clinicName: string): CalendarBubbleData {
    const applied = item.kind === 'Applied';
    const kindLabel = applied ? 'Uygulanan aşı' : item.kind === 'NextDue' ? 'Sonraki aşı' : 'Planlı aşı';

    return {
        time: applied && item.atUtc ? `${formatUtcIsoAsLocalTimeDisplay(item.atUtc)} · uygulandı` : 'Gün içinde',
        title: `${kindLabel}: ${item.vaccineName}`,
        subject: `${item.clientName} – ${item.petName}`,
        place: `${clinicName || 'Klinik'} – hekim atanmamış`,
        notes: item.notes,
        status: vaccineStateLabel(item.state),
        tone: vaccineDotClass(item.state)
    };
}

export function appointmentBubble(item: AppointmentCalendarItemVm, clinicName: string): CalendarBubbleData {
    const status = typeof item.status === 'number' ? item.status : parseAppointmentStatusRawToEnum(item.status);

    return {
        time: item.timeRangeLabel,
        title: item.reasonName ? `${item.appointmentTypeLabel} (${item.reasonName})` : item.appointmentTypeLabel,
        subject: `${item.clientName} – ${item.petName}`,
        place: `${clinicName || 'Klinik'} – ${item.veterinarianUserId ? item.veterinarianName : 'Hekim seçilmedi'}`,
        notes: item.notes,
        status: item.statusLabel,
        tone: status === 3 ? 'bg-amber-500' : status === 1 || status === 2 ? 'bg-surface-400' : 'bg-primary'
    };
}

/** Günün aşıları: gecikmiş, bugün, ileri, uygulandı sırasıyla; aynı durumda hasta adına göre. */
export function vaccinesOn(dateKey: string, items: readonly VaccinationCalendarItemVm[]): VaccinationCalendarItemVm[] {
    const order: Record<CalendarItemState, number> = { Overdue: 0, DueToday: 1, Upcoming: 2, Completed: 3 };

    return items.filter((v) => v.dateKey === dateKey).sort((a, b) => order[a.state] - order[b.state] || a.petName.localeCompare(b.petName, 'tr'));
}
