import { HttpParams } from '@angular/common/http';
import type { VaccinationListItemDto, VaccinationListItemDtoPagedResult } from '@/app/features/vaccinations/models/vaccination-api.model';
import type { VaccinationsListQuery } from '@/app/features/vaccinations/models/vaccination-query.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { normalizeVaccinationStatusKey } from '@/app/features/vaccinations/utils/vaccination-status.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

export function mapVaccinationListItemDtoToVm(dto: VaccinationListItemDto): VaccinationListItemVm {
    const rawName = dto.vaccineName?.trim() || dto.name?.trim() || null;
    return {
        id: dto.id,
        appliedAtUtc: dto.appliedAtUtc ?? null,
        nextDueAtUtc: dto.nextDueAtUtc ?? null,
        vaccineName: str(rawName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        status: dto.status?.trim() ? dto.status : null,
        notes: str(dto.notes)
    };
}

export function mapPagedVaccinationsToVm(result: VaccinationListItemDtoPagedResult): {
    items: VaccinationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapVaccinationListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** Page, PageSize, Search, Status, FromDate, ToDate, Sort, Order */
export function vaccinationsQueryToHttpParams(query: VaccinationsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.status?.trim()) {
        p = p.set('Status', query.status.trim());
    }
    if (query.fromDate?.trim()) {
        p = p.set('FromDate', query.fromDate.trim());
    }
    if (query.toDate?.trim()) {
        p = p.set('ToDate', query.toDate.trim());
    }
    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }
    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }
    return p;
}

/** Status filtresi: API desteklemediğinde istemci tarafında uygulanır (normalize ile eşleşir). */
export function filterVaccinationListByStatus(
    items: VaccinationListItemVm[],
    status: string | null | undefined
): VaccinationListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    const target = normalizeVaccinationStatusKey(s);
    return items.filter((i) => {
        const st = (i.status ?? '').trim();
        if (!st) {
            return false;
        }
        return normalizeVaccinationStatusKey(st) === target;
    });
}
