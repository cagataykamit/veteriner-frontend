import type { ClinicWorkingHourWriteItemDto, UpdateClinicWorkingHoursRequestDto } from '@/app/features/clinics/models/clinic-working-hours-api.model';
import type { ClinicWorkingHourFormValue, ClinicWorkingHourVm } from '@/app/features/clinics/models/clinic-working-hours-vm.model';

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object';
}

function readTriBool(o: Record<string, unknown>, keys: string[]): boolean | null {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'boolean') {
            return v;
        }
        if (typeof v === 'string') {
            const t = v.trim().toLowerCase();
            if (t === 'true' || t === '1') {
                return true;
            }
            if (t === 'false' || t === '0') {
                return false;
            }
        }
    }
    return null;
}

function firstString(o: Record<string, unknown>, keys: string[]): string | null {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string') {
            return v.trim() ? v.trim() : null;
        }
    }
    return null;
}

function numFromRecord(o: Record<string, unknown>, keys: string[]): number | null {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return v;
        }
        if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
            return Number(v.trim());
        }
    }
    return null;
}

/** `09:00:00` → `09:00`; boş → `''` — `type="time"` uyumu. */
export function normalizeTimeForInput(value: string | null | undefined): string {
    const t = (value ?? '').trim();
    if (!t) {
        return '';
    }
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    if (!m) {
        return t.slice(0, 5);
    }
    return `${String(Number(m[1])).padStart(2, '0')}:${String(Number(m[2])).padStart(2, '0')}`;
}

function padTimeHm(s: string): string {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) {
        return s.trim().slice(0, 5);
    }
    const h = String(Number(m[1])).padStart(2, '0');
    const min = String(Number(m[2])).padStart(2, '0');
    return `${h}:${min}`;
}

const TR_DAY: Record<number, string> = {
    0: 'Pazar',
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi'
};

export function clinicWorkingHourDayLabel(dayOfWeek: number): string {
    return TR_DAY[dayOfWeek] ?? `Gün ${dayOfWeek}`;
}

export function mapClinicWorkingHourRaw(raw: unknown): ClinicWorkingHourVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const dow = numFromRecord(raw, ['dayOfWeek', 'DayOfWeek']);
    if (dow === null || dow < 0 || dow > 6) {
        return null;
    }
    const isClosedTri = readTriBool(raw, ['isClosed', 'IsClosed']);
    const isClosed = isClosedTri === true;
    const opensAt = firstString(raw, ['opensAt', 'OpensAt']);
    const closesAt = firstString(raw, ['closesAt', 'ClosesAt']);
    const breakStartsAt = firstString(raw, ['breakStartsAt', 'BreakStartsAt']);
    const breakEndsAt = firstString(raw, ['breakEndsAt', 'BreakEndsAt']);
    return {
        dayOfWeek: dow,
        dayLabel: clinicWorkingHourDayLabel(dow),
        isClosed,
        opensAt: opensAt ?? null,
        closesAt: closesAt ?? null,
        breakStartsAt: breakStartsAt ?? null,
        breakEndsAt: breakEndsAt ?? null
    };
}

function extractWorkingHoursArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (!isRecord(raw)) {
        return [];
    }
    for (const k of ['items', 'Items', 'data', 'Data', 'value', 'Value', 'result', 'Result']) {
        const v = raw[k];
        if (Array.isArray(v)) {
            return v;
        }
    }
    return [];
}

export function mapClinicWorkingHoursListRaw(raw: unknown): ClinicWorkingHourVm[] {
    const rows = extractWorkingHoursArray(raw)
        .map((x) => mapClinicWorkingHourRaw(x))
        .filter((x): x is ClinicWorkingHourVm => !!x);
    return [...rows].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export function mapClinicWorkingHoursResponse(raw: unknown): ClinicWorkingHourVm[] {
    if (!raw || typeof raw !== 'object') {
        return [];
    }
    const o = raw as Record<string, unknown>;
    for (const k of ['data', 'Data', 'value', 'Value', 'result', 'Result']) {
        const inner = o[k];
        if (inner !== undefined && inner !== null) {
            return mapClinicWorkingHoursListRaw(inner);
        }
    }
    return mapClinicWorkingHoursListRaw(raw);
}

function timeToApiOrNull(s: string | null | undefined): string | null {
    const t = (s ?? '').trim();
    if (!t) {
        return null;
    }
    return padTimeHm(t);
}

/** Form satırından PUT öğesi — kapalı günde tüm saatler `null`. */
export function clinicWorkingHourFormRowToWriteItem(row: ClinicWorkingHourFormValue): ClinicWorkingHourWriteItemDto {
    if (row.isClosed) {
        return {
            dayOfWeek: row.dayOfWeek,
            isClosed: true,
            opensAt: null,
            closesAt: null,
            breakStartsAt: null,
            breakEndsAt: null
        };
    }
    const bs = (row.breakStartsAt ?? '').trim();
    const be = (row.breakEndsAt ?? '').trim();
    const breakStartsAt = bs && be ? timeToApiOrNull(bs) : null;
    const breakEndsAt = bs && be ? timeToApiOrNull(be) : null;
    return {
        dayOfWeek: row.dayOfWeek,
        isClosed: false,
        opensAt: timeToApiOrNull(row.opensAt),
        closesAt: timeToApiOrNull(row.closesAt),
        breakStartsAt,
        breakEndsAt
    };
}

export function clinicWorkingHoursFormToPutBody(days: ClinicWorkingHourFormValue[]): UpdateClinicWorkingHoursRequestDto {
    const sorted = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    return { items: sorted.map((d) => clinicWorkingHourFormRowToWriteItem(d)) };
}
