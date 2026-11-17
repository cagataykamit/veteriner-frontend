import type { ImportBatchDto } from '@/app/features/imports/models/import-api.model';
import { canStartRollback, isRollbackFinal } from '@/app/features/imports/utils/import-labels.utils';

type RollbackWindowFields = Pick<ImportBatchDto, 'status' | 'canRollback' | 'rollbackDeadlineUtc'>;

/**
 * Geri alma süresinin kullanıcıya görünen hâli (sözleşme 9.1; kural ve son an sunucuda).
 * - `open`: son an bugünden sonraki bir takvim gününde; `daysLeft` ≥ 1 ("12 gün daha").
 * - `lastDay`: son an bugün (İstanbul takvim günü) ve henüz geçmedi.
 * - `final`: süre doldu, aktarma kesinleşti.
 * Gün farkı saat farkı değil, İstanbul takvim günü farkıdır: yarın 09:00'da biten süre bugün "1 gün daha", yarın "bugün son gün".
 */
export type RollbackWindowState = { kind: 'open'; daysLeft: number; deadlineUtc: string } | { kind: 'lastDay'; deadlineUtc: string } | { kind: 'final'; deadlineUtc: string };

const ISTANBUL = 'Europe/Istanbul';

export function rollbackWindowState(b: RollbackWindowFields, now: Date = new Date()): RollbackWindowState | null {
    const deadlineUtc = b.rollbackDeadlineUtc;

    if (!deadlineUtc) {
        return null;
    }

    const deadline = new Date(deadlineUtc);

    if (isRollbackFinal(b) || now.getTime() >= deadline.getTime()) {
        return { kind: 'final', deadlineUtc };
    }

    if (!canStartRollback(b)) {
        return null;
    }

    const daysLeft = istanbulDayNumber(deadline) - istanbulDayNumber(now);

    return daysLeft <= 0 ? { kind: 'lastDay', deadlineUtc } : { kind: 'open', daysLeft, deadlineUtc };
}

/** Liste satırı: "12 gün daha geri alınabilir · 2 Aralık 15:57'ye kadar" ya da son günde "15:57'ye kadar geri alınabilir". */
export function rollbackWindowListText(state: RollbackWindowState): string {
    const d = istanbulParts(new Date(state.deadlineUtc));

    switch (state.kind) {
        case 'open':
            return `${state.daysLeft} gün daha geri alınabilir · ${d.day} ${d.monthName} ${timeUntil(d)} kadar`;
        case 'lastDay':
            return `${timeUntil(d)} kadar geri alınabilir`;
        case 'final':
            return 'Kesinleşti';
    }
}

/** Geri al sayfası ve aktarma tamamlandı ekranı: kalan gün önde, kesin tarih yanında. */
export function rollbackWindowSentence(state: RollbackWindowState, lead = 'Bu aktarmayı'): string {
    const d = istanbulParts(new Date(state.deadlineUtc));

    switch (state.kind) {
        case 'open':
            return `${lead} ${state.daysLeft} gün daha geri alabilirsiniz (${d.day} ${d.monthName} ${d.year}, ${timeUntil(d)} kadar). Bu tarihten sonra aktarma kesinleşir ve geri alınamaz.`;
        case 'lastDay':
            return `${lead} geri almak için bugün son gün (${timeUntil(d)} kadar). Bu saatten sonra aktarma kesinleşir ve geri alınamaz.`;
        case 'final':
            return `Geri alma süresi doldu (son gün ${d.day} ${d.monthName} ${d.year}, ${d.time}).`;
    }
}

/** Aktarmadan önce (onay adımı): "Aktarmadan sonra 15 gün içinde geri alabilirsiniz." Süre bilinmiyorsa null. */
export function rollbackWindowBeforeCommitText(windowDays: number | null | undefined): string | null {
    return windowDays && windowDays > 0 ? `Aktarmadan sonra ${windowDays} gün içinde geri alabilirsiniz; bu sürenin sonunda aktarma kesinleşir.` : null;
}

/** Saat ve yönelme eki: "15:57'ye", "15:00'e", "10:30'a" (son okunan sayıya göre; dakika 0 ise saat). */
export function timeWithDative(hour: number, minute: number): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${pad(hour)}:${pad(minute)}${dativeSuffix(minute === 0 ? hour : minute)}`;
}

/** bir'e, iki'ye, üç'e, dört'e, beş'e, altı'ya, yedi'ye, sekiz'e, dokuz'a; sıfır'a, on'a, yirmi'ye, otuz'a, kırk'a, elli'ye. */
const UNIT_DATIVE = ['', "'e", "'ye", "'e", "'e", "'e", "'ya", "'ye", "'e", "'a"];
const TENS_DATIVE = ["'a", "'a", "'ye", "'a", "'a", "'ye"];

function dativeSuffix(n: number): string {
    return n % 10 !== 0 ? UNIT_DATIVE[n % 10] : TENS_DATIVE[Math.floor(n / 10)];
}

function timeUntil(d: IstanbulParts): string {
    return timeWithDative(d.hour, d.minute);
}

interface IstanbulParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    monthName: string;
    time: string;
}

const PARTS_FORMAT = new Intl.DateTimeFormat('en-GB', { timeZone: ISTANBUL, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const MONTH_FORMAT = new Intl.DateTimeFormat('tr-TR', { timeZone: ISTANBUL, month: 'long' });

function istanbulParts(date: Date): IstanbulParts {
    const parts = Object.fromEntries(PARTS_FORMAT.formatToParts(date).map((p) => [p.type, p.value]));
    const hour = Number(parts['hour']);
    const minute = Number(parts['minute']);

    return {
        year: Number(parts['year']),
        month: Number(parts['month']),
        day: Number(parts['day']),
        hour,
        minute,
        monthName: MONTH_FORMAT.format(date),
        time: `${parts['hour']}:${parts['minute']}`
    };
}

/** İstanbul takvim gününün sıra numarası (gün farkı için). */
function istanbulDayNumber(date: Date): number {
    const p = istanbulParts(date);

    return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
}
