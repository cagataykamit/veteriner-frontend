import { HttpParams } from '@angular/common/http';
import type {
    SpeciesDetailDto,
    SpeciesListItemDto,
    SpeciesUpsertRequestDto
} from '@/app/features/species/models/species-api.model';
import type { SpeciesUpsertRequest } from '@/app/features/species/models/species-upsert.model';
import type { SpeciesDetailVm, SpeciesListItemVm } from '@/app/features/species/models/species-vm.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v.trim() : EM;
}

export function mapSpeciesListItemDtoToVm(dto: SpeciesListItemDto): SpeciesListItemVm {
    return {
        id: dto.id,
        code: str(dto.code),
        name: str(dto.name),
        isActive: dto.isActive ?? false,
        displayOrder: dto.displayOrder ?? 0
    };
}

export function mapSpeciesDetailDtoToVm(dto: SpeciesDetailDto): SpeciesDetailVm {
    return {
        id: dto.id,
        code: str(dto.code),
        name: str(dto.name),
        isActive: dto.isActive ?? false,
        displayOrder: dto.displayOrder ?? 0
    };
}

export function mapSpeciesUpsertToApiBody(req: SpeciesUpsertRequest): SpeciesUpsertRequestDto {
    return {
        code: req.code.trim(),
        name: req.name.trim(),
        isActive: !!req.isActive,
        displayOrder: Number.isFinite(req.displayOrder) ? req.displayOrder : 0
    };
}

export function mapSpeciesListResponseToVm(raw: unknown): SpeciesListItemVm[] {
    const items = extractSpeciesListItems(raw);
    return items.map((x) => mapSpeciesListItemDtoToVm(x));
}

/**
 * GET `/api/v1/species` — lookup için `activeOnly: true` → Http query **`isActive=true`** (backend filtresi).
 * Parametre gönderilmezse tüm kayıtlar (ör. panel tür listesi).
 */
export function speciesListQueryToHttpParams(options?: { activeOnly?: boolean }): HttpParams | undefined {
    if (options?.activeOnly === true) {
        return new HttpParams().set('isActive', 'true');
    }
    return undefined;
}

export function extractCreatedSpeciesIdFromPostResponse(body: unknown): string | null {
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
    const idKeys = ['id', 'Id', 'speciesId', 'SpeciesId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'species', 'Species'];
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

function extractSpeciesListItems(raw: unknown): SpeciesListItemDto[] {
    if (Array.isArray(raw)) {
        return raw.filter(isSpeciesLike).map(normalizeSpeciesLike);
    }
    if (!raw || typeof raw !== 'object') {
        return [];
    }
    const o = raw as Record<string, unknown>;
    const candidates = [o['items'], o['data'], o['value'], o['result']];
    for (const c of candidates) {
        if (Array.isArray(c)) {
            return c.filter(isSpeciesLike).map(normalizeSpeciesLike);
        }
        if (c && typeof c === 'object') {
            const inner = c as Record<string, unknown>;
            if (Array.isArray(inner['items'])) {
                return inner['items'].filter(isSpeciesLike).map(normalizeSpeciesLike);
            }
        }
    }
    return [];
}

function isSpeciesLike(v: unknown): v is SpeciesListItemDto {
    if (!v || typeof v !== 'object') {
        return false;
    }
    const o = v as Record<string, unknown>;
    return typeof o['id'] === 'string' || typeof o['Id'] === 'string';
}

function normalizeSpeciesLike(v: SpeciesListItemDto): SpeciesListItemDto {
    const o = v as SpeciesListItemDto & {
        Id?: string | null;
        Code?: string | null;
        Name?: string | null;
        IsActive?: boolean | null;
        DisplayOrder?: number | null;
    };
    return {
        id: o.id ?? o.Id ?? '',
        code: o.code ?? o.Code ?? null,
        name: o.name ?? o.Name ?? null,
        isActive: o.isActive ?? o.IsActive ?? null,
        displayOrder: o.displayOrder ?? o.DisplayOrder ?? null
    };
}
