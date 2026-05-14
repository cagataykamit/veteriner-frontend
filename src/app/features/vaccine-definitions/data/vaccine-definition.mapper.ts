import { HttpParams } from '@angular/common/http';
import type { VaccineDefinitionDto, VaccineDefinitionDtoPagedResult } from '@/app/features/vaccine-definitions/models/vaccine-definition-api.model';
import type { VaccineDefinitionListItemVm } from '@/app/features/vaccine-definitions/models/vaccine-definition-vm.model';

function firstTrimmed(...vals: Array<string | null | undefined>): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function readDtoString(dto: VaccineDefinitionDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

export function mapVaccineDefinitionDtoToVm(dto: VaccineDefinitionDto): VaccineDefinitionListItemVm {
    const id = firstTrimmed(dto.id, readDtoString(dto, ['Id'])) ?? '';
    return {
        id,
        tenantId: firstTrimmed(dto.tenantId ?? undefined, readDtoString(dto, ['TenantId'])),
        speciesId: firstTrimmed(dto.speciesId ?? undefined, readDtoString(dto, ['SpeciesId'])),
        name: firstTrimmed(dto.name, readDtoString(dto, ['Name'])) ?? '',
        code: firstTrimmed(dto.code, readDtoString(dto, ['Code'])) ?? '',
        description: firstTrimmed(dto.description ?? undefined, readDtoString(dto, ['Description'])),
        defaultNextDueDays:
            typeof dto.defaultNextDueDays === 'number' && !Number.isNaN(dto.defaultNextDueDays)
                ? dto.defaultNextDueDays
                : null,
        isCore: typeof dto.isCore === 'boolean' ? dto.isCore : readDtoString(dto, ['IsCore']) === 'true',
        isActive: typeof dto.isActive === 'boolean' ? dto.isActive : readDtoString(dto, ['IsActive']) !== 'false'
    };
}

export function mapPagedVaccineDefinitionsToVm(result: VaccineDefinitionDtoPagedResult): {
    items: VaccineDefinitionListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapVaccineDefinitionDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export interface VaccineDefinitionsListParams {
    search?: string;
    speciesId?: string | null;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
}

export function vaccineDefinitionsQueryToHttpParams(query: VaccineDefinitionsListParams): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 200;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    p = p.set('includeInactive', String(query.includeInactive ?? false));
    if (query.search?.trim()) {
        p = p.set('search', query.search.trim());
    }
    if (query.speciesId?.trim()) {
        p = p.set('speciesId', query.speciesId.trim());
    }
    return p;
}
