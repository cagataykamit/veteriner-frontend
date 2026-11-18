/** Takvim ay görünümü gün özeti (`GET …/calendar/summary`; BE sözleşmesi §7). Randevu ve aşı aynı şekli kullanır. */
export interface CalendarDaySummaryDto {
    date?: string | null;
    total?: number | null;
    dueToday?: number | null;
    upcoming?: number | null;
    overdue?: number | null;
    completed?: number | null;
}

export interface CalendarDaySummaryVm {
    dateKey: string;
    total: number;
    dueToday: number;
    upcoming: number;
    overdue: number;
    completed: number;
}

/** Gün anahtarına göre özet; tarihsiz satır atlanır. */
export function mapCalendarDaySummaries(items: CalendarDaySummaryDto[] | null | undefined): Map<string, CalendarDaySummaryVm> {
    const n = (v: number | null | undefined) => (typeof v === 'number' && v > 0 ? v : 0);
    const map = new Map<string, CalendarDaySummaryVm>();

    for (const d of items ?? []) {
        const dateKey = d.date?.slice(0, 10) ?? '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            map.set(dateKey, { dateKey, total: n(d.total), dueToday: n(d.dueToday), upcoming: n(d.upcoming), overdue: n(d.overdue), completed: n(d.completed) });
        }
    }

    return map;
}

/** Günlük randevu kapasitesi (`GET …/calendar/capacity`; BE sözleşmesi §8.4); kapalı gün 0. */
export interface CalendarDayCapacityDto {
    date?: string | null;
    capacity?: number | null;
}

/** Gün anahtarına göre kapasite; tarihsiz satır atlanır. */
export function mapCalendarDayCapacities(items: CalendarDayCapacityDto[] | null | undefined): Map<string, number> {
    const map = new Map<string, number>();

    for (const d of items ?? []) {
        const dateKey = d.date?.slice(0, 10) ?? '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            map.set(dateKey, typeof d.capacity === 'number' && d.capacity > 0 ? d.capacity : 0);
        }
    }

    return map;
}
