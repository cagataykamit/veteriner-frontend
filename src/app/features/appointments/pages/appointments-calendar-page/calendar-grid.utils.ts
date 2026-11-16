import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { isAppointmentCancelledStatus } from '@/app/entities/appointment/utils/appointment-status.utils';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { addGregorianDaysToYmd, toIstanbulDateInputValue, toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';

/**
 * Saat ızgaralı takvimin saf hesapları (B1). Saatler İstanbul duvar saatidir (çalışma saatleri ve randevu formu ile aynı); dakika
 * gece yarısından sayılır. Çakışma kuralı backend ile aynıdır: iptal olmayan randevular aynı hekimde ya da aynı hastada üst üste
 * binerse çakışır (hekimsiz randevu yalnız hasta üzerinden).
 */

export interface CalendarBlock {
    item: AppointmentCalendarItemVm;
    dateKey: string;
    start: number;
    end: number;
    /** Yan yana şerit sırası ve o gruptaki şerit sayısı (üst üste binenler). */
    lane: number;
    lanes: number;
}

export interface WorkingDay {
    open: number;
    close: number;
    breakStart: number | null;
    breakEnd: number | null;
}

export interface Gap {
    start: number;
    end: number;
}

export const DEFAULT_GRID_START = 8 * 60;
export const DEFAULT_GRID_END = 20 * 60;

export function minutesOf(hm: string | null | undefined): number | null {
    const m = /^(\d{1,2}):(\d{2})/.exec(hm?.trim() ?? '');

    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function clockLabel(minute: number): string {
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** Randevunun İstanbul günü ve dakikaları; saat yoksa null. Gün sonunu aşan randevu o günün sonunda kesilir. */
export function toBlockTimes(item: AppointmentCalendarItemVm): { dateKey: string; start: number; end: number } | null {
    const dateKey = toIstanbulDateInputValue(item.scheduledAtUtc);
    const start = minutesOf(toIstanbulTimeInputValue(item.scheduledAtUtc));

    if (!dateKey || start === null) {
        return null;
    }

    return { dateKey, start, end: Math.min(24 * 60, start + Math.max(5, item.durationMinutes || 0)) };
}

export function isCancelled(item: AppointmentCalendarItemVm): boolean {
    return isAppointmentCancelledStatus(item.status);
}

/** Aynı hekimde ya da aynı hastada üst üste binen, iptal olmayan randevuların kimlikleri. */
export function conflictIds(items: readonly AppointmentCalendarItemVm[]): Set<string> {
    const ids = new Set<string>();
    const live = items
        .filter((i) => !isCancelled(i))
        .map((item) => ({ item, t: toBlockTimes(item) }))
        .filter((x): x is { item: AppointmentCalendarItemVm; t: NonNullable<ReturnType<typeof toBlockTimes>> } => x.t !== null);

    for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
            const a = live[i];
            const b = live[j];
            const sameVet = !!a.item.veterinarianUserId && a.item.veterinarianUserId === b.item.veterinarianUserId;
            const samePet = !!a.item.petId && a.item.petId === b.item.petId;

            if (a.t.dateKey === b.t.dateKey && (sameVet || samePet) && a.t.start < b.t.end && b.t.start < a.t.end) {
                ids.add(a.item.id);
                ids.add(b.item.id);
            }
        }
    }

    return ids;
}

/** Bir sütundaki randevuları üst üste binenler yan yana gelecek şekilde şeritlere dağıtır. */
export function layoutBlocks(items: readonly AppointmentCalendarItemVm[]): CalendarBlock[] {
    const blocks = items
        .map((item) => ({ item, t: toBlockTimes(item) }))
        .filter((x): x is { item: AppointmentCalendarItemVm; t: NonNullable<ReturnType<typeof toBlockTimes>> } => x.t !== null)
        .sort((a, b) => a.t.start - b.t.start || b.t.end - a.t.end);
    const out: CalendarBlock[] = [];
    let group: CalendarBlock[] = [];
    let groupEnd = -1;

    const flush = (): void => {
        const lanes = Math.max(1, ...group.map((g) => g.lane + 1));

        group.forEach((g) => (g.lanes = lanes));
        out.push(...group);
        group = [];
    };

    for (const { item, t } of blocks) {
        if (group.length && t.start >= groupEnd) {
            flush();
            groupEnd = -1;
        }

        const used = new Set(group.filter((g) => g.end > t.start).map((g) => g.lane));
        let lane = 0;

        while (used.has(lane)) {
            lane++;
        }

        group.push({ item, dateKey: t.dateKey, start: t.start, end: t.end, lane, lanes: 1 });
        groupEnd = Math.max(groupEnd, t.end);
    }

    if (group.length) {
        flush();
    }

    return out;
}

/** yyyy-MM-dd gününün haftanın günü (0 = pazar; backend `DayOfWeek` ile aynı). */
export function dayOfWeekOf(dateKey: string): number {
    return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

export function workingDayFor(hours: readonly ClinicWorkingHourVm[], dateKey: string): WorkingDay | null {
    const row = hours.find((h) => h.dayOfWeek === dayOfWeekOf(dateKey));
    const open = minutesOf(row?.opensAt);
    const close = minutesOf(row?.closesAt);

    if (!row || row.isClosed || open === null || close === null || close <= open) {
        return null;
    }

    return { open, close, breakStart: minutesOf(row.breakStartsAt), breakEnd: minutesOf(row.breakEndsAt) };
}

export function isOpenAt(day: WorkingDay | null, minute: number): boolean {
    if (!day || minute < day.open || minute >= day.close) {
        return false;
    }

    return !(day.breakStart !== null && day.breakEnd !== null && minute >= day.breakStart && minute < day.breakEnd);
}

/** Izgaranın saat aralığı: haftanın en erken açılışı – en geç kapanışı (tam saate), dışarıda kalan randevular da sığar. */
export function gridBounds(hours: readonly ClinicWorkingHourVm[], blocks: readonly CalendarBlock[]): { start: number; end: number } {
    const days = [0, 1, 2, 3, 4, 5, 6].map((dow) => hours.find((h) => h.dayOfWeek === dow)).filter((h): h is ClinicWorkingHourVm => !!h && !h.isClosed);
    const opens = days.map((h) => minutesOf(h.opensAt)).filter((m): m is number => m !== null);
    const closes = days.map((h) => minutesOf(h.closesAt)).filter((m): m is number => m !== null);
    let start = opens.length ? Math.min(...opens) : DEFAULT_GRID_START;
    let end = closes.length ? Math.max(...closes) : DEFAULT_GRID_END;

    for (const b of blocks) {
        start = Math.min(start, b.start);
        end = Math.max(end, b.end);
    }

    return { start: Math.floor(start / 60) * 60, end: Math.min(24 * 60, Math.ceil(end / 60) * 60) };
}

/** Çalışma saatinde, mola ve verilen randevular dışında kalan aralıklar (iptaller boş sayılır). */
export function freeGaps(day: WorkingDay | null, items: readonly AppointmentCalendarItemVm[], minLength: number): Gap[] {
    if (!day) {
        return [];
    }

    const busy = items
        .filter((i) => !isCancelled(i))
        .map(toBlockTimes)
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => ({ start: t.start, end: t.end }))
        .concat(day.breakStart !== null && day.breakEnd !== null ? [{ start: day.breakStart, end: day.breakEnd }] : [])
        .sort((a, b) => a.start - b.start);
    const gaps: Gap[] = [];
    let cursor = day.open;

    for (const b of busy) {
        if (b.start > cursor) {
            gaps.push({ start: cursor, end: Math.min(b.start, day.close) });
        }

        cursor = Math.max(cursor, b.end);
    }

    if (day.close > cursor) {
        gaps.push({ start: cursor, end: day.close });
    }

    return gaps.filter((g) => g.end - g.start >= minLength);
}

/** Tıklanabilir satır adımı: klinik slot aralığının 15 dakikadan küçük olmayan ilk katı (5 → 15, 10 → 20, 30 → 30). */
export function rowStepMinutes(slotIntervalMinutes: number): number {
    const interval = Math.max(1, Math.trunc(slotIntervalMinutes) || 15);

    return Math.ceil(15 / interval) * interval;
}

/** Pazartesiden başlayan haftanın günleri (yyyy-MM-dd). */
export function weekDateKeys(anyDateKey: string): string[] {
    const dow = dayOfWeekOf(anyDateKey);
    const monday = addGregorianDaysToYmd(anyDateKey, dow === 0 ? -6 : 1 - dow) ?? anyDateKey;

    return [0, 1, 2, 3, 4, 5, 6].map((i) => addGregorianDaysToYmd(monday, i) ?? monday);
}

/** Listelerin hepsinde ortak boş aralıklar (telefonda "herkes boş" satırları). */
export function intersectGaps(lists: readonly Gap[][], minLength: number): Gap[] {
    if (lists.length === 0) {
        return [];
    }

    return lists
        .slice(1)
        .reduce<Gap[]>(
            (acc, list) => {
                const out: Gap[] = [];

                for (const a of acc) {
                    for (const b of list) {
                        const start = Math.max(a.start, b.start);
                        const end = Math.min(a.end, b.end);

                        if (end > start) {
                            out.push({ start, end });
                        }
                    }
                }

                return out;
            },
            [...lists[0]]
        )
        .filter((g) => g.end - g.start >= minLength);
}

/** O gün o saatte (verilen süre boyunca) randevusu olmayan ilk hekim; yoksa null (form hekimsiz açılır). */
export function firstFreeVeterinarian(vetIds: readonly string[], items: readonly AppointmentCalendarItemVm[], dateKey: string, minute: number, duration: number): string | null {
    const busy = new Set(
        items
            .filter((i) => !isCancelled(i) && !!i.veterinarianUserId)
            .filter((i) => {
                const t = toBlockTimes(i);

                return !!t && t.dateKey === dateKey && t.start < minute + duration && minute < t.end;
            })
            .map((i) => i.veterinarianUserId!)
    );

    return vetIds.find((v) => !busy.has(v)) ?? null;
}

export function durationText(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    return h && m ? `${h} sa ${m} dk` : h ? `${h} sa` : `${m} dk`;
}

/** Ay ızgarası: ayın ilk gününün haftasından son gününün haftasına pazartesi başlangıçlı haftalar (4–6 hafta, en çok 42 gün). */
export function monthGridWeeks(anyDateKey: string): string[][] {
    const monthKey = anyDateKey.slice(0, 7);
    const weeks: string[][] = [];
    let week = weekDateKeys(`${monthKey}-01`);

    while (week[0].slice(0, 7) <= monthKey && weeks.length < 6) {
        weeks.push(week);
        week = weekDateKeys(addGregorianDaysToYmd(week[6], 1) ?? week[6]);
    }

    return weeks;
}
