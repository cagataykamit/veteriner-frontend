import type { DashboardTrendDayVm } from '@/app/features/dashboard/models/dashboard-trend.model';

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function padToSeven(values: number[]): number[] {
    const a = [...values];
    if (a.length > 7) {
        return a.slice(-7);
    }
    while (a.length < 7) {
        a.unshift(0);
    }
    return a;
}

function toFiniteNumber(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) {
        return v;
    }
    if (typeof v === 'string' && v.trim()) {
        const n = Number.parseFloat(v.trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/** Yerel takvimde bugünden geriye 7 gün; soldan sağa eski → yeni; kısa etiket `dd.MM`. */
export function lastSevenLocalDayLabels(): string[] {
    const out: string[] = [];
    const base = new Date();
    for (let offset = 6; offset >= 0; offset--) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        out.push(`${dd}.${mm}`);
    }
    return out;
}

/** `lastSevenLocalDayLabels()` ile aynı sıra — yerel takvim `yyyy-MM-dd` (API gün anahtarı eşlemesi). */
export function lastSevenLocalCalendarIsoDays(): string[] {
    const out: string[] = [];
    const base = new Date();
    for (let offset = 6; offset >= 0; offset--) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        out.push(`${y}-${m}-${day}`);
    }
    return out;
}

function isoDayKeyFromRecord(o: Record<string, unknown>): string | null {
    for (const k of ['date', 'Date', 'day', 'Day', 'paidDate', 'PaidDate']) {
        const v = o[k];
        if (typeof v !== 'string' || !v.trim()) {
            continue;
        }
        const head = v.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
            return head;
        }
    }
    return null;
}

/** `{ "2026-04-20": 21500, ... }` veya benzeri tarih → tutar haritası. */
function tryParseDateKeyedPaidAmounts(raw: Record<string, unknown>): number[] | null {
    const isoDays = lastSevenLocalCalendarIsoDays();
    const map = new Map<string, number>();
    for (const [k0, v] of Object.entries(raw)) {
        const k = k0.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) {
            continue;
        }
        let n = toFiniteNumber(v);
        if (n === null && isRecord(v)) {
            n = paidAmountFromRow(v);
        }
        if (n === null) {
            continue;
        }
        map.set(k, n);
    }
    if (map.size === 0) {
        return null;
    }
    return isoDays.map((d) => map.get(d) ?? 0);
}

/** `[{ date|day, amount|totalAmount, ... }]` — gün bazında toplayıp son 7 yerel güne hizalar. */
function tryParsePaidAmountObjectRows(arr: unknown[]): number[] | null {
    if (arr.length === 0 || !isRecord(arr[0])) {
        return null;
    }
    const map = new Map<string, number>();
    let any = false;
    for (const x of arr) {
        if (!isRecord(x)) {
            continue;
        }
        const day = isoDayKeyFromRecord(x);
        if (!day) {
            continue;
        }
        const n = paidAmountFromRow(x);
        if (n === null) {
            continue;
        }
        const prev = map.get(day) ?? 0;
        map.set(day, prev + n);
        any = true;
    }
    if (!any) {
        return null;
    }
    return lastSevenLocalCalendarIsoDays().map((d) => map.get(d) ?? 0);
}

function objectToNumericValue(o: Record<string, unknown>, keys: string[]): number {
    for (const k of keys) {
        const n = toFiniteNumber(o[k]);
        if (n !== null) {
            return n;
        }
    }
    return 0;
}

const PAID_ROW_AMOUNT_KEYS = [
    'amount',
    'Amount',
    'totalAmount',
    'TotalAmount',
    'totalPaid',
    'TotalPaid',
    'paid',
    'Paid',
    'value',
    'Value',
    'sum',
    'Sum'
] as const;

function paidAmountFromRow(o: Record<string, unknown>): number | null {
    for (const k of PAID_ROW_AMOUNT_KEYS) {
        const n = toFiniteNumber(o[k]);
        if (n !== null) {
            return n;
        }
    }
    return null;
}

/**
 * Randevu sayısı serisi — `number[]`, `{ count }` vb. veya boş; her zaman 7 uzunluk.
 */
export function parseLastSevenDayAppointmentCounts(raw: unknown): number[] {
    if (raw == null) {
        return padToSeven([]);
    }
    if (Array.isArray(raw)) {
        if (raw.length === 0) {
            return padToSeven([]);
        }
        if (typeof raw[0] === 'number' || (typeof raw[0] === 'string' && !isRecord(raw[0]))) {
            return padToSeven(
                raw.map((x) => {
                    const n = toFiniteNumber(x);
                    return n ?? 0;
                })
            );
        }
        if (isRecord(raw[0])) {
            return padToSeven(
                raw.map((x) => {
                    if (!isRecord(x)) {
                        return 0;
                    }
                    return objectToNumericValue(x, [
                        'count',
                        'Count',
                        'value',
                        'Value',
                        'appointments',
                        'Appointments',
                        'appointmentCount',
                        'AppointmentCount',
                        'total',
                        'Total'
                    ]);
                })
            );
        }
    }
    if (isRecord(raw)) {
        for (const k of ['items', 'Items', 'days', 'Days', 'values', 'Values', 'data', 'Data']) {
            const inner = raw[k];
            if (inner !== undefined) {
                return parseLastSevenDayAppointmentCounts(inner);
            }
        }
    }
    return padToSeven([]);
}

/**
 * Tahsilat tutar serisi — `number[]` veya `{ amount|totalPaid|paid|value }` nesneleri.
 */
export function parseLastSevenDayPaidAmounts(raw: unknown): number[] {
    if (raw == null) {
        return padToSeven([]);
    }
    if (Array.isArray(raw)) {
        if (raw.length === 0) {
            return padToSeven([]);
        }
        if (typeof raw[0] === 'number' || (typeof raw[0] === 'string' && !isRecord(raw[0]))) {
            return padToSeven(
                raw.map((x) => {
                    const n = toFiniteNumber(x);
                    return n ?? 0;
                })
            );
        }
        if (isRecord(raw[0])) {
            const byDay = tryParsePaidAmountObjectRows(raw);
            if (byDay) {
                return padToSeven(byDay);
            }
            return padToSeven(
                raw.map((x) => {
                    if (!isRecord(x)) {
                        return 0;
                    }
                    return objectToNumericValue(x, [
                        'amount',
                        'Amount',
                        'totalAmount',
                        'TotalAmount',
                        'totalPaid',
                        'TotalPaid',
                        'paid',
                        'Paid',
                        'value',
                        'Value',
                        'sum',
                        'Sum'
                    ]);
                })
            );
        }
    }
    if (isRecord(raw)) {
        for (const k of ['items', 'Items', 'days', 'Days', 'values', 'Values', 'data', 'Data']) {
            const inner = raw[k];
            if (inner !== undefined) {
                return parseLastSevenDayPaidAmounts(inner);
            }
        }
        const dateKeyed = tryParseDateKeyedPaidAmounts(raw);
        if (dateKeyed) {
            return padToSeven(dateKeyed);
        }
    }
    return padToSeven([]);
}

export function buildSevenDayTrendPoints(values: number[]): readonly DashboardTrendDayVm[] {
    const labels = lastSevenLocalDayLabels();
    const v = padToSeven(values);
    return labels.map((label, i) => ({ label, value: v[i] ?? 0 }));
}
