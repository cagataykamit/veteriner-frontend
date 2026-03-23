import { HttpParams } from '@angular/common/http';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';
import type {
    AppointmentCreateRequestDto,
    AppointmentDetailDto,
    AppointmentListItemDto,
    AppointmentListItemDtoPagedResult
} from '@/app/features/appointments/models/appointment-api.model';
import type { CreateAppointmentRequest } from '@/app/features/appointments/models/appointment-create.model';
import type { AppointmentsListQuery } from '@/app/features/appointments/models/appointment-query.model';
import type { AppointmentDetailVm, AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

function firstTrimmed(...vals: Array<string | null | undefined>): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function canonicalAppointmentType(dto: AppointmentListItemDto | AppointmentDetailDto): string | null {
    return firstTrimmed(dto.type, dto.appointmentType, dto.appointmentTypeName, dto.appointmentTypeCode);
}

function canonicalAppointmentStatus(dto: AppointmentListItemDto | AppointmentDetailDto): string | null {
    return firstTrimmed(dto.status, dto.appointmentStatus, dto.lifecycleStatus, dto.lifecycle);
}

function canonicalLifecycleStatus(dto: AppointmentListItemDto | AppointmentDetailDto): string | null {
    return firstTrimmed(dto.lifecycleStatus, dto.lifecycle, dto.status, dto.appointmentStatus);
}

export function mapAppointmentListItemDtoToVm(dto: AppointmentListItemDto): AppointmentListItemVm {
    const rawType = canonicalAppointmentType(dto);
    const rawStatus = canonicalAppointmentStatus(dto);
    const rawLifecycle = canonicalLifecycleStatus(dto);
    return {
        id: dto.id,
        scheduledAtUtc: dto.scheduledAtUtc ?? null,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        type: str(rawType),
        status: rawStatus,
        lifecycleStatus: rawLifecycle,
        reason: dto.reason?.trim() ? dto.reason : EM,
        createdAtUtc: dto.createdAtUtc ?? null
    };
}

export function mapAppointmentDetailDtoToVm(dto: AppointmentDetailDto): AppointmentDetailVm {
    const rawType = canonicalAppointmentType(dto);
    const rawStatus = canonicalAppointmentStatus(dto);
    const rawLifecycle = canonicalLifecycleStatus(dto);
    return {
        id: dto.id,
        scheduledAtUtc: dto.scheduledAtUtc ?? null,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        type: str(rawType),
        status: rawStatus,
        lifecycleStatus: rawLifecycle,
        reason: dto.reason?.trim() ? dto.reason : EM,
        notes: dto.notes?.trim() ? dto.notes : EM,
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
    };
}

export function mapCreateAppointmentToApiBody(req: CreateAppointmentRequest): AppointmentCreateRequestDto {
    const type = req.type?.trim() ? req.type.trim() : null;
    return {
        clientId: req.clientId.trim(),
        petId: req.petId.trim(),
        scheduledAtUtc: req.scheduledAtUtc,
        type,
        // Geçici geri uyumluluk: bazı backend sürümleri `appointmentType` anahtarını bekleyebilir.
        appointmentType: type,
        reason: req.reason?.trim() ? req.reason.trim() : null,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
}

export function mapPagedAppointmentsToVm(result: AppointmentListItemDtoPagedResult): {
    items: AppointmentListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapAppointmentListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** Swagger / API parametre isimleri: Page, PageSize, Search, Sort, Order, Status, FromDate, ToDate */
export function appointmentsQueryToHttpParams(query: AppointmentsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }
    if (query.clientId?.trim()) {
        p = p.set('ClientId', query.clientId.trim());
    }
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.status?.trim()) {
        const status = query.status.trim();
        p = p.set('Status', status);
        // Geçici geri uyumluluk: bazı backend sürümleri lifecycle filtresi bekleyebilir.
        p = p.set('LifecycleStatus', status);
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

/** Status filtresi: API desteklemediğinde istemci tarafında uygulanır. */
export function filterAppointmentListByStatus(
    items: AppointmentListItemVm[],
    status: string | null | undefined
): AppointmentListItemVm[] {
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
