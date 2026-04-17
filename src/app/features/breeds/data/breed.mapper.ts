import { HttpParams } from '@angular/common/http';
import type {
    BreedCreateRequestDto,
    BreedDetailDto,
    BreedListItemDto,
    BreedUpdateRequestDto
} from '@/app/features/breeds/models/breed-api.model';
import type { BreedUpsertRequest } from '@/app/features/breeds/models/breed-upsert.model';
import type { BreedDetailVm, BreedListItemVm } from '@/app/features/breeds/models/breed-vm.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v.trim() : EM;
}

function speciesName(v: string | null | undefined): string {
    return v?.trim() ? v.trim() : '-';
}

export function mapBreedListItemDtoToVm(dto: BreedListItemDto): BreedListItemVm {
    return {
        id: dto.id,
        speciesId: dto.speciesId?.trim() ? dto.speciesId : null,
        speciesName: speciesName(dto.speciesName),
        name: str(dto.name),
        isActive: dto.isActive ?? false
    };
}

export function mapBreedDetailDtoToVm(dto: BreedDetailDto): BreedDetailVm {
    return {
        id: dto.id,
        speciesId: dto.speciesId?.trim() ? dto.speciesId : null,
        speciesName: speciesName(dto.speciesName),
        speciesCode: str(dto.speciesCode),
        name: str(dto.name),
        isActive: dto.isActive ?? false
    };
}

export function mapBreedCreateToApiBody(req: BreedUpsertRequest): BreedCreateRequestDto {
    return {
        speciesId: req.speciesId.trim(),
        name: req.name.trim()
    };
}

export function mapBreedUpdateToApiBody(id: string, req: BreedUpsertRequest): BreedUpdateRequestDto {
    return {
        id: id.trim(),
        name: req.name.trim(),
        isActive: req.isActive !== undefined ? !!req.isActive : false
    };
}

/** GET `/api/v1/breeds` — sunucu tarafı filtre (species listesi / lookup ile uyumlu). */
export function breedListQueryToHttpParams(options?: { activeOnly?: boolean; speciesId?: string }): HttpParams | undefined {
    let params = new HttpParams();
    let has = false;
    if (options?.activeOnly === true) {
        params = params.set('isActive', 'true');
        has = true;
    }
    const sid = options?.speciesId?.trim();
    if (sid) {
        params = params.set('speciesId', sid);
        has = true;
    }
    return has ? params : undefined;
}

export function mapBreedListResponseToVm(raw: unknown): BreedListItemVm[] {
    const items = extractBreedListItems(raw);
    return items.map((x) => mapBreedListItemDtoToVm(x));
}

export function extractCreatedBreedIdFromPostResponse(body: unknown): string | null {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        return body.trim() || null;
    }
    if (typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const idKeys = ['id', 'Id', 'breedId', 'BreedId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'breed', 'Breed'];
    for (const w of wrappers) {
        const inner = o[w];
        if (inner && typeof inner === 'object') {
            const n = inner as Record<string, unknown>;
            for (const k of idKeys) {
                const v = n[k];
                if (typeof v === 'string' && v.trim()) {
                    return v.trim();
                }
                if (typeof v === 'number' && !Number.isNaN(v)) {
                    return String(v);
                }
            }
        }
    }
    return null;
}

function extractBreedListItems(raw: unknown): BreedListItemDto[] {
    if (Array.isArray(raw)) {
        return raw.filter(isBreedLike).map(normalizeBreedLike);
    }
    if (!raw || typeof raw !== 'object') {
        return [];
    }
    const o = raw as Record<string, unknown>;
    const candidates = [o['items'], o['data'], o['value'], o['result']];
    for (const c of candidates) {
        if (Array.isArray(c)) {
            return c.filter(isBreedLike).map(normalizeBreedLike);
        }
        if (c && typeof c === 'object') {
            const inner = c as Record<string, unknown>;
            if (Array.isArray(inner['items'])) {
                return inner['items'].filter(isBreedLike).map(normalizeBreedLike);
            }
        }
    }
    return [];
}

function isBreedLike(v: unknown): v is BreedListItemDto {
    if (!v || typeof v !== 'object') {
        return false;
    }
    const o = v as Record<string, unknown>;
    return typeof o['id'] === 'string' || typeof o['Id'] === 'string';
}

function normalizeBreedLike(v: BreedListItemDto): BreedListItemDto {
    const o = v as BreedListItemDto & {
        Id?: string | null;
        SpeciesId?: string | null;
        SpeciesName?: string | null;
        Name?: string | null;
        IsActive?: boolean | null;
    };
    return {
        id: o.id ?? o.Id ?? '',
        speciesId: o.speciesId ?? o.SpeciesId ?? null,
        speciesName: o.speciesName ?? o.SpeciesName ?? null,
        name: o.name ?? o.Name ?? null,
        isActive: o.isActive ?? o.IsActive ?? null
    };
}
