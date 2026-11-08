import type { SiteSlot, WorkingDay } from '../model/site.model';

/** Çalışma saatlerinden sayfada görünen durum ve saat tablosu. Klinik saatleri İstanbul duvar saatidir: sunucu ve ziyaretçi nerede olursa olsun hesap Europe/Istanbul'a göredir. */
export type ClinicStatusState = 'open' | 'break' | 'closed';

export interface ClinicStatus {
    readonly state: ClinicStatusState;
    /** Tek sözcük: Açık, Molada, Kapalı. */
    readonly word: string;
    readonly detail: string;
}

export interface HoursGroup {
    readonly label: string;
    readonly value: string;
    readonly note: string | null;
    readonly isToday: boolean;
}

/** Sayfada günler pazartesiden başlar. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_NAMES: Readonly<Record<number, string>> = {
    0: 'Pazar',
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi'
};

const ISTANBUL_CLOCK = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Verilen anın İstanbul'daki günü (0 pazar) ve gece yarısından itibaren dakikası. */
export function istanbulClock(now: Date): { readonly day: number; readonly minute: number } {
    const parts = Object.fromEntries(ISTANBUL_CLOCK.formatToParts(now).map((part) => [part.type, part.value]));

    return { day: WEEKDAYS.indexOf(parts['weekday']), minute: Number(parts['hour']) * 60 + Number(parts['minute']) };
}

/** "HH:mm" → gece yarısından itibaren dakika. */
function toMinutes(time: string | null): number | null {
    if (!time) return null;

    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
}

function isOpenDay(day: WorkingDay | undefined): day is WorkingDay {
    return !!day && !day.isClosed && !!day.opensAt && !!day.closesAt;
}

/** Saate ek gelmesin diye ("19:00'a", "17:00'ye") durum metni "Kapanış 19:00" biçimindedir. */
export function clinicStatus(days: readonly WorkingDay[], now: Date): ClinicStatus {
    const { day: weekday, minute } = istanbulClock(now);
    const today = days.find((d) => d.dayOfWeek === weekday);

    if (isOpenDay(today)) {
        const opens = toMinutes(today.opensAt)!;
        const closes = toMinutes(today.closesAt)!;
        const breakStart = toMinutes(today.breakStartsAt);
        const breakEnd = toMinutes(today.breakEndsAt);

        if (breakStart !== null && breakEnd !== null && minute >= breakStart && minute < breakEnd) {
            return { state: 'break', word: 'Molada', detail: `Dönüş ${today.breakEndsAt}` };
        }

        if (minute >= opens && minute < closes) {
            return { state: 'open', word: 'Açık', detail: `Kapanış ${today.closesAt}` };
        }

        if (minute < opens) {
            return { state: 'closed', word: 'Kapalı', detail: `Açılış bugün ${today.opensAt}` };
        }
    }

    for (let offset = 1; offset <= 7; offset++) {
        const next = days.find((d) => d.dayOfWeek === (weekday + offset) % 7);

        if (isOpenDay(next)) {
            const when = offset === 1 ? 'yarın' : DAY_NAMES[next.dayOfWeek];

            return { state: 'closed', word: 'Kapalı', detail: `Açılış ${when} ${next.opensAt}` };
        }
    }

    return { state: 'closed', word: 'Kapalı', detail: 'Saat girilmemiş' };
}

/** Aynı saatlere sahip ardışık günler tek satır olur: "Pazartesi – Cuma". */
export function hoursGroups(days: readonly WorkingDay[], now: Date): HoursGroup[] {
    const { day: weekday } = istanbulClock(now);
    const groups: { first: number; last: number; day: WorkingDay | undefined; key: string; isToday: boolean }[] = [];

    for (const dayOfWeek of DAY_ORDER) {
        const day = days.find((d) => d.dayOfWeek === dayOfWeek);
        const key = isOpenDay(day) ? `${day.opensAt}|${day.closesAt}|${day.breakStartsAt}|${day.breakEndsAt}` : 'closed';
        const current = groups.at(-1);

        if (current?.key === key) {
            current.last = dayOfWeek;
            current.isToday ||= dayOfWeek === weekday;
        } else {
            groups.push({ first: dayOfWeek, last: dayOfWeek, day, key, isToday: dayOfWeek === weekday });
        }
    }

    return groups.map((g) => ({
        label: g.first === g.last ? DAY_NAMES[g.first] : `${DAY_NAMES[g.first]} – ${DAY_NAMES[g.last]}`,
        value: isOpenDay(g.day) ? `${g.day.opensAt}–${g.day.closesAt}` : 'Kapalı',
        note: isOpenDay(g.day) && g.day.breakStartsAt ? `Mola ${g.day.breakStartsAt}–${g.day.breakEndsAt}` : null,
        isToday: g.isToday
    }));
}

/** En yakın müsait saatin düğmesi: talep formuna bu saat önceden seçili gider (TIER-017, `?saat=`). */
export interface SlotVm {
    readonly time: string;
    readonly href: string;
    readonly label: string;
}

export interface SlotDayVm {
    readonly label: string;
    readonly slots: readonly SlotVm[];
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const ISTANBUL_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
const ISTANBUL_TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11-09" → "Pazartesi, 9 Kasım"; bugün ve yarın adıyla. Gün API'den İstanbul takvimiyle gelir, burada yeniden hesaplanmaz. */
function slotDayLabel(date: string, now: Date): string {
    const [year, month, day] = date.split('-').map(Number);
    const name = date === ISTANBUL_DATE.format(now) ? 'Bugün' : date === ISTANBUL_DATE.format(new Date(now.getTime() + DAY_MS)) ? 'Yarın' : DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

    return `${name}, ${day} ${MONTH_NAMES[month - 1]}`;
}

/**
 * En yakın müsait saatler güne göre (TIER-017). Online randevu kapalıysa (`bookingHref` yok) gösterim yoktur. Saatler İstanbul duvar
 * saatidir; bağlantı talep formudur, saat önceden seçili gelir. Okunamayan satır atlanır.
 */
export function nextSlotDays(slots: readonly SiteSlot[], bookingHref: string | null, now: Date): SlotDayVm[] {
    if (!bookingHref) return [];

    const days: { label: string; date: string; slots: SlotVm[] }[] = [];
    const separator = bookingHref.includes('?') ? '&' : '?';

    for (const slot of slots) {
        const start = new Date(slot.startUtc);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date) || Number.isNaN(start.getTime())) continue;

        let day = days.at(-1);

        if (day?.date !== slot.date) {
            day = { label: slotDayLabel(slot.date, now), date: slot.date, slots: [] };
            days.push(day);
        }

        const time = ISTANBUL_TIME.format(start);

        day.slots.push({ time, href: `${bookingHref}${separator}saat=${encodeURIComponent(slot.startUtc)}`, label: `${day.label} ${time} için talep formunu aç` });
    }

    return days.map(({ label, slots: daySlots }) => ({ label, slots: daySlots }));
}
