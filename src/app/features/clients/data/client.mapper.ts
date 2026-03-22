import { HttpParams } from '@angular/common/http';
import type { ClientDetailDto, ClientListItemDto, ClientListItemDtoPagedResult } from '@/app/features/clients/models/client-api.model';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';
import type { ClientDetailVm, ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import type { ClientsListQuery } from '@/app/features/clients/models/client-query.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

export function mapClientListItemDtoToVm(dto: ClientListItemDto): ClientListItemVm {
    return {
        id: dto.id,
        fullName: str(dto.fullName),
        phone: str(dto.phone),
        email: dto.email?.trim() ? dto.email : EM,
        petCount: dto.petCount ?? null,
        status: dto.status?.trim() ? dto.status : null,
        createdAtUtc: dto.createdAtUtc ?? null
    };
}

export function mapClientDetailDtoToVm(dto: ClientDetailDto): ClientDetailVm {
    const pets = dto.petsSummary;
    const appt = dto.appointmentsSummary;

    return {
        id: dto.id,
        fullName: str(dto.fullName),
        phone: str(dto.phone),
        email: str(dto.email),
        notes: dto.notes?.trim() ? dto.notes : EM,
        address: dto.address?.trim() ? dto.address : EM,
        status: dto.status?.trim() ? dto.status : null,
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null,
        petsSummary: {
            totalCount: pets?.totalCount ?? 0,
            items: (pets?.items ?? []).map((p) => ({
                id: p.id,
                name: p.name?.trim() ? p.name! : EM
            }))
        },
        appointmentsSummary: {
            totalCount: appt?.totalCount ?? 0,
            upcomingCount: appt?.upcomingCount ?? null
        }
    };
}

export function mapPagedClientsToVm(result: ClientListItemDtoPagedResult): {
    items: ClientListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapClientListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** Swagger parametre isimleri: Page, PageSize, Sort, Order, Search */
export function clientsQueryToHttpParams(query: ClientsListQuery): HttpParams {
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
    return p;
}

/** Status filtresi: API desteklemediğinde istemci tarafında uygulanır. */
export function filterClientListByStatus(items: ClientListItemVm[], status: string | null | undefined): ClientListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    const target = normalizeFilterKey(s);
    return items.filter((i) => {
        const st = (i.status ?? '').trim();
        if (!st) {
            return false;
        }
        return normalizeFilterKey(st) === target;
    });
}
