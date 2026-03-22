import { HttpParams } from '@angular/common/http';
import type {
    PetDetailDto,
    PetListItemDto,
    PetListItemDtoPagedResult
} from '@/app/features/pets/models/pet-api.model';
import type { PetsListQuery } from '@/app/features/pets/models/pet-query.model';
import type { PetDetailVm, PetListItemVm } from '@/app/features/pets/models/pet-vm.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

export function mapPetListItemDtoToVm(dto: PetListItemDto): PetListItemVm {
    return {
        id: dto.id,
        name: str(dto.name),
        species: str(dto.species),
        breed: str(dto.breed),
        ownerName: str(dto.ownerName),
        gender: str(dto.gender),
        birthDateUtc: dto.birthDateUtc ?? null,
        status: dto.status?.trim() ? dto.status : null
    };
}

export function mapPetDetailDtoToVm(dto: PetDetailDto): PetDetailVm {
    const vac = dto.vaccinationsSummary;
    const ex = dto.examinationsSummary;
    const ap = dto.appointmentsSummary;

    const weightStr =
        dto.weight != null && !Number.isNaN(Number(dto.weight)) ? String(dto.weight) : EM;

    return {
        id: dto.id,
        name: str(dto.name),
        species: str(dto.species),
        breed: str(dto.breed),
        gender: str(dto.gender),
        birthDateUtc: dto.birthDateUtc ?? null,
        color: str(dto.color),
        weight: weightStr,
        status: dto.status?.trim() ? dto.status : null,
        notes: dto.notes != null && dto.notes.trim().length > 0 ? dto.notes : EM,
        ownerId: dto.ownerId != null && dto.ownerId.trim().length > 0 ? dto.ownerId : null,
        ownerName: str(dto.ownerName),
        ownerPhone: str(dto.ownerPhone),
        vaccinationsSummary: {
            totalCount: vac?.totalCount ?? 0,
            items: (vac?.items ?? []).map((x) => ({
                id: x.id,
                name: str(x.name)
            }))
        },
        examinationsSummary: {
            totalCount: ex?.totalCount ?? 0,
            lastExaminedAtUtc: ex?.lastExaminedAtUtc ?? null
        },
        appointmentsSummary: {
            totalCount: ap?.totalCount ?? 0,
            upcomingCount: ap?.upcomingCount ?? null
        }
    };
}

export function mapPagedPetsToVm(result: PetListItemDtoPagedResult): {
    items: PetListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    return {
        items: (result.items ?? []).map(mapPetListItemDtoToVm),
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export function petsQueryToHttpParams(query: PetsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }
    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }
    if (query.species?.trim()) {
        p = p.set('Species', query.species.trim());
    }
    if (query.clientId?.trim()) {
        p = p.set('ClientId', query.clientId.trim());
    }
    return p;
}

export function filterPetListByStatus(items: PetListItemVm[], status: string | null | undefined): PetListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    return items.filter((i) => (i.status ?? '').toLowerCase() === s.toLowerCase());
}
