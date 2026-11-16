import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { parseAppointmentStatusRawToEnum } from '@/app/entities/appointment/utils/appointment-status.utils';
import type { VaccinationCalendarItemVm, VaccinationCalendarState } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import type { CalendarBubbleData } from '@/app/features/appointments/components/calendar-bubble';

/**
 * Takvim aşı katmanı ve ayrıntı balonu (kullanıcı kararı 2026-11-16). Aşı randevu değildir: ayrı listede tutulur, ızgaranın saat dilimine,
 * çakışmaya ve boş saat hesabına girmez; günün üst şeridinde gösterilir.
 */

const VACCINE_LAYER_KEY = 'vetinity.calendar.vaccineLayer';

/** Katman tercihi kullanıcının tarayıcısında; okunamazsa açık. */
export function readVaccineLayerPreference(): boolean {
    try {
        return localStorage.getItem(VACCINE_LAYER_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function writeVaccineLayerPreference(on: boolean): void {
    try {
        localStorage.setItem(VACCINE_LAYER_KEY, on ? 'on' : 'off');
    } catch {
        // Depolama kapalıysa tercih yalnız bu oturumda kalır.
    }
}

/** Renkler (kullanıcı): bugün sarı, ileri tarih siyah/koyu (gri değil), gecikmiş kırmızı, uygulandı yeşil. */
export function vaccineChipClass(state: VaccinationCalendarState): string {
    switch (state) {
        case 'DueToday':
            return 'bg-yellow-200 border-yellow-500 text-yellow-950 dark:bg-yellow-400 dark:border-yellow-300 dark:text-yellow-950';
        case 'Overdue':
            return 'bg-red-50 border-red-500 text-red-700 dark:bg-red-950 dark:border-red-500 dark:text-red-300';
        case 'Applied':
            return 'bg-green-50 border-green-600 text-green-800 dark:bg-green-950 dark:border-green-500 dark:text-green-300';
        default:
            return 'bg-surface-0 border-surface-900 text-surface-900 dark:bg-surface-900 dark:border-surface-0 dark:text-surface-0';
    }
}

export function vaccineDotClass(state: VaccinationCalendarState): string {
    switch (state) {
        case 'DueToday':
            return 'bg-yellow-400';
        case 'Overdue':
            return 'bg-red-500';
        case 'Applied':
            return 'bg-green-600';
        default:
            return 'bg-surface-900 dark:bg-surface-0';
    }
}

export function vaccineStateLabel(state: VaccinationCalendarState): string {
    switch (state) {
        case 'DueToday':
            return 'Bugün yapılacak';
        case 'Overdue':
            return 'Gecikmiş, yapılmadı';
        case 'Applied':
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
    const order: Record<VaccinationCalendarState, number> = { Overdue: 0, DueToday: 1, Upcoming: 2, Applied: 3 };

    return items.filter((v) => v.dateKey === dateKey).sort((a, b) => order[a.state] - order[b.state] || a.petName.localeCompare(b.petName, 'tr'));
}
