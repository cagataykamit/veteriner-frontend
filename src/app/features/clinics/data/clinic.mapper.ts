import type { ClinicDetailDto, ClinicListItemDto } from '@/app/features/clinics/models/clinic-api.model';
import type { ClinicDetailVm, ClinicListItemVm } from '@/app/features/clinics/models/clinic-vm.model';

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object';
}

function firstString(o: Record<string, unknown>, keys: string[]): string | null {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function readTriBool(raw: Record<string, unknown>, keys: string[]): boolean | null {
    for (const k of keys) {
        const v = raw[k];
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

function extractClinicListRootArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (!isRecord(raw)) {
        return [];
    }
    for (const k of ['items', 'Items', 'data', 'Data', 'value', 'Value', 'result', 'Result', 'clinics', 'Clinics']) {
        const v = raw[k];
        if (Array.isArray(v)) {
            return v;
        }
    }
    return [];
}

function mapListRow(raw: unknown): ClinicListItemVm | null {
    if (!isRecord(raw)) {
        return null;
    }
    const id = firstString(raw, ['id', 'Id', 'clinicId', 'ClinicId']);
    const name = firstString(raw, ['name', 'Name', 'clinicName', 'ClinicName', 'title', 'Title']);
    if (!id) {
        return null;
    }
    const city = firstString(raw, ['city', 'City']) ?? '';
    const isActive = readTriBool(raw, ['isActive', 'IsActive', 'active', 'Active']);
    return {
        id,
        name: name ?? '—',
        city,
        isActive
    };
}

export function mapClinicsListRaw(raw: unknown): ClinicListItemVm[] {
    return extractClinicListRootArray(raw)
        .map((row) => mapListRow(row))
        .filter((x): x is ClinicListItemVm => !!x);
}

export function mapClinicDetailDtoToVm(dto: ClinicDetailDto | Record<string, unknown>): ClinicDetailVm | null {
    const o = dto as Record<string, unknown>;
    const id = firstString(o, ['id', 'Id', 'clinicId', 'ClinicId']);
    if (!id) {
        return null;
    }
    const name = firstString(o, ['name', 'Name', 'clinicName', 'ClinicName']) ?? '';
    const city = firstString(o, ['city', 'City']) ?? '';
    const isActive = readTriBool(o, ['isActive', 'IsActive', 'active', 'Active']);
    return { id, name, city, isActive };
}

export function mapClinicDetailRaw(raw: unknown): ClinicDetailVm | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const o = raw as Record<string, unknown>;
    let inner: Record<string, unknown> = o;
    for (const k of ['data', 'Data', 'value', 'Value', 'result', 'Result']) {
        const v = o[k];
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            inner = v as Record<string, unknown>;
            break;
        }
    }
    return mapClinicDetailDtoToVm(inner);
}

export function clinicUpsertToUpdateDto(name: string, city: string): { name: string; city: string } {
    return { name: name.trim(), city: city.trim() };
}

/**
 * POST create yanıtından klinik kimliği — düz GUID, `ClinicDetailDto` veya sarmalayıcı.
 * Gövde boş / ID yoksa `null` (çağıran liste + toast ile devam eder).
 */
export function extractCreatedClinicIdFromPostResponse(raw: unknown): string | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === 'string') {
        const t = raw.trim();
        return /^[0-9a-f-]{36}$/i.test(t) ? t : null;
    }
    const vm = mapClinicDetailRaw(raw);
    if (vm?.id) {
        return vm.id;
    }
    if (!isRecord(raw)) {
        return null;
    }
    return firstString(raw, ['id', 'Id', 'clinicId', 'ClinicId']);
}
