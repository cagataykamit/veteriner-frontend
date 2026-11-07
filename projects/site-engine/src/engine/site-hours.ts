import type { WorkingDay } from '../model/site.model';

/** Çalışma saatlerinden sayfada görünen durum ve saat tablosu. Hesap yerel saate göredir. */
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
    const minute = now.getHours() * 60 + now.getMinutes();
    const today = days.find((d) => d.dayOfWeek === now.getDay());

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
        const next = days.find((d) => d.dayOfWeek === (now.getDay() + offset) % 7);

        if (isOpenDay(next)) {
            const when = offset === 1 ? 'yarın' : DAY_NAMES[next.dayOfWeek];

            return { state: 'closed', word: 'Kapalı', detail: `Açılış ${when} ${next.opensAt}` };
        }
    }

    return { state: 'closed', word: 'Kapalı', detail: 'Saat girilmemiş' };
}

/** Aynı saatlere sahip ardışık günler tek satır olur: "Pazartesi – Cuma". */
export function hoursGroups(days: readonly WorkingDay[], now: Date): HoursGroup[] {
    const groups: { first: number; last: number; day: WorkingDay | undefined; key: string; isToday: boolean }[] = [];

    for (const dayOfWeek of DAY_ORDER) {
        const day = days.find((d) => d.dayOfWeek === dayOfWeek);
        const key = isOpenDay(day) ? `${day.opensAt}|${day.closesAt}|${day.breakStartsAt}|${day.breakEndsAt}` : 'closed';
        const current = groups.at(-1);

        if (current?.key === key) {
            current.last = dayOfWeek;
            current.isToday ||= dayOfWeek === now.getDay();
        } else {
            groups.push({ first: dayOfWeek, last: dayOfWeek, day, key, isToday: dayOfWeek === now.getDay() });
        }
    }

    return groups.map((g) => ({
        label: g.first === g.last ? DAY_NAMES[g.first] : `${DAY_NAMES[g.first]} – ${DAY_NAMES[g.last]}`,
        value: isOpenDay(g.day) ? `${g.day.opensAt}–${g.day.closesAt}` : 'Kapalı',
        note: isOpenDay(g.day) && g.day.breakStartsAt ? `Mola ${g.day.breakStartsAt}–${g.day.breakEndsAt}` : null,
        isToday: g.isToday
    }));
}
