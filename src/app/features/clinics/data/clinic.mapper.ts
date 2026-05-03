import type { ClinicDetailDto, ClinicUpdateRequestDto } from '@/app/features/clinics/models/clinic-api.model';
import type { ClinicUpsertFormValue } from '@/app/features/clinics/models/clinic-upsert.model';
import { normalizeClinicPhoneForApi } from '@/app/features/clinics/utils/clinic-phone-format.utils';
import type { ClinicDetailVm, ClinicListItemVm } from '@/app/features/clinics/models/clinic-vm.model';

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object';
}

/** Boş/null backend alanları UI’da `''`; Pascal/camel toleranslı. */
function nullableStringField(o: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = o[k];
        if (v === null || v === undefined) {
            continue;
        }
        if (typeof v === 'string') {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    return '';
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
    const phone = nullableStringField(raw, ['phone', 'Phone', 'phoneNumber', 'PhoneNumber']);
    const email = nullableStringField(raw, ['email', 'Email', 'emailAddress', 'EmailAddress']);
    return {
        id,
        name: name ?? '—',
        city,
        isActive,
        phone,
        email
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
    const phone = nullableStringField(o, ['phone', 'Phone', 'phoneNumber', 'PhoneNumber']);
    const email = nullableStringField(o, ['email', 'Email', 'emailAddress', 'EmailAddress']);
    const address = nullableStringField(o, ['address', 'Address']);
    const description = nullableStringField(o, ['description', 'Description']);
    return { id, name, city, isActive, phone, email, address, description };
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

/**
 * PUT/POST gövdesi — tüm profil alanları her istekte gönderilir (boş alanlar `null`).
 */
export function clinicProfileToWriteDto(v: ClinicUpsertFormValue): ClinicUpdateRequestDto {
    const name = v.name.trim();
    const city = v.city.trim();
    const phone = normalizeClinicPhoneForApi(v.phone);
    const email = v.email.trim();
    const address = v.address.trim();
    const description = v.description.trim();
    return {
        name,
        city,
        phone: phone === '' ? null : phone,
        email: email === '' ? null : email,
        address: address === '' ? null : address,
        description: description === '' ? null : description
    };
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
