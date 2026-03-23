import type {
    BreedDetailDto,
    BreedListItemDto,
    BreedUpsertRequestDto
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
        code: str(dto.code),
        name: str(dto.name),
        isActive: dto.isActive ?? false,
        displayOrder: dto.displayOrder ?? 0
    };
}

export function mapBreedDetailDtoToVm(dto: BreedDetailDto): BreedDetailVm {
    return {
        id: dto.id,
        speciesId: dto.speciesId?.trim() ? dto.speciesId : null,
        speciesName: speciesName(dto.speciesName),
        code: str(dto.code),
        name: str(dto.name),
        isActive: dto.isActive ?? false,
        displayOrder: dto.displayOrder ?? 0
    };
}

export function mapBreedUpsertToApiBody(req: BreedUpsertRequest): BreedUpsertRequestDto {
    return {
        speciesId: req.speciesId.trim(),
        code: req.code.trim(),
        name: req.name.trim(),
        isActive: !!req.isActive,
        displayOrder: Number.isFinite(req.displayOrder) ? req.displayOrder : 0
    };
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
        Code?: string | null;
        Name?: string | null;
        IsActive?: boolean | null;
        DisplayOrder?: number | null;
    };
    return {
        id: o.id ?? o.Id ?? '',
        speciesId: o.speciesId ?? o.SpeciesId ?? null,
        speciesName: o.speciesName ?? o.SpeciesName ?? null,
        code: o.code ?? o.Code ?? null,
        name: o.name ?? o.Name ?? null,
        isActive: o.isActive ?? o.IsActive ?? null,
        displayOrder: o.displayOrder ?? o.DisplayOrder ?? null
    };
}
