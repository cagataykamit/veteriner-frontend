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
import type { AppointmentDetailVm, AppointmentEditVm, AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { resolveAppointmentWriteTypeFormValue } from '@/app/features/appointments/utils/appointment-type.utils';
import { resolveAppointmentWriteStatusFormValue } from '@/app/features/appointments/utils/appointment-status.utils';

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

function readDtoString(dto: AppointmentDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function readNestedName(dto: Record<string, unknown>, objectKeys: string[], nameKeys: string[]): string | null {
    for (const ok of objectKeys) {
        const inner = dto[ok];
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
            const io = inner as Record<string, unknown>;
            for (const nk of nameKeys) {
                const v = io[nk];
                if (typeof v === 'string' && v.trim()) {
                    return v.trim();
                }
            }
        }
    }
    return null;
}

function canonicalScheduledAtUtc(dto: AppointmentDetailDto): string | null {
    return firstTrimmed(
        dto.scheduledAtUtc,
        dto.scheduledAt,
        dto.startAtUtc,
        dto.startsAtUtc,
        readDtoString(dto, ['ScheduledAtUtc', 'StartAtUtc', 'StartsAtUtc'])
    );
}

function canonicalClientIdDetail(dto: AppointmentDetailDto): string | null {
    return firstTrimmed(dto.clientId, dto.ownerId, readDtoString(dto, ['ClientId', 'OwnerId', 'CustomerId']));
}

function canonicalPetIdDetail(dto: AppointmentDetailDto): string | null {
    return firstTrimmed(dto.petId, dto.animalId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function rawClientNameDetail(dto: AppointmentDetailDto): string | null {
    const nested = readNestedName(dto as unknown as Record<string, unknown>, ['client', 'Client', 'owner', 'Owner', 'customer', 'Customer'], [
        'name',
        'Name',
        'fullName',
        'FullName'
    ]);
    return firstTrimmed(dto.clientName, dto.ownerName, readDtoString(dto, ['ClientName', 'OwnerName', 'CustomerName']), nested);
}

function rawPetNameDetail(dto: AppointmentDetailDto): string | null {
    const nested = readNestedName(dto as unknown as Record<string, unknown>, ['pet', 'Pet', 'animal', 'Animal'], [
        'name',
        'Name',
        'fullName',
        'FullName'
    ]);
    return firstTrimmed(dto.petName, dto.animalName, readDtoString(dto, ['PetName', 'AnimalName']), nested);
}

function canonicalReasonDetail(dto: AppointmentDetailDto): string {
    return firstTrimmed(dto.reason, dto.appointmentReason, readDtoString(dto, ['Reason', 'AppointmentReason'])) ?? '';
}

function canonicalNotesDetail(dto: AppointmentDetailDto): string {
    return firstTrimmed(dto.notes, readDtoString(dto, ['Notes'])) ?? '';
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
    const scheduledAt = canonicalScheduledAtUtc(dto);
    const clientId = canonicalClientIdDetail(dto);
    const petId = canonicalPetIdDetail(dto);
    const reason = canonicalReasonDetail(dto);
    const notes = canonicalNotesDetail(dto);
    return {
        id: dto.id,
        scheduledAtUtc: scheduledAt,
        clientId: clientId?.trim() ? clientId : null,
        clientName: str(rawClientNameDetail(dto)),
        petId: petId?.trim() ? petId : null,
        petName: str(rawPetNameDetail(dto)),
        type: str(rawType),
        status: rawStatus,
        lifecycleStatus: rawLifecycle,
        reason: reason.trim() ? reason : EM,
        notes: notes.trim() ? notes : EM,
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
    };
}

export function mapAppointmentDetailDtoToEditVm(dto: AppointmentDetailDto): AppointmentEditVm {
    const rawType = canonicalAppointmentType(dto);
    const rawStatus = canonicalAppointmentStatus(dto);
    const clientId = canonicalClientIdDetail(dto) ?? '';
    const petId = canonicalPetIdDetail(dto) ?? '';
    return {
        id: dto.id,
        clientId,
        petId,
        clientName: rawClientNameDetail(dto),
        petName: rawPetNameDetail(dto),
        scheduledAtUtc: canonicalScheduledAtUtc(dto),
        type: resolveAppointmentWriteTypeFormValue(rawType),
        status: resolveAppointmentWriteStatusFormValue(rawStatus),
        reason: canonicalReasonDetail(dto),
        notes: canonicalNotesDetail(dto)
    };
}

/** Create ve update write hattında status boş gelirse backend ile uyumlu tek varsayılan. */
export const APPOINTMENT_DEFAULT_WRITE_STATUS = 'scheduled';

export function resolveAppointmentWriteStatus(status?: string | null): string {
    const t = status?.trim();
    return t ? t : APPOINTMENT_DEFAULT_WRITE_STATUS;
}

export interface AppointmentUpsertFormAdapterInput {
    clinicId: string;
    clientId: string;
    petId: string;
    scheduledAtUtc: string;
    type: string;
    status: string;
    reason?: string;
    notes?: string;
}

export function mapAppointmentUpsertFormToCreateRequest(input: AppointmentUpsertFormAdapterInput): CreateAppointmentRequest {
    return {
        clinicId: input.clinicId.trim(),
        clientId: input.clientId.trim(),
        petId: input.petId.trim(),
        scheduledAtUtc: input.scheduledAtUtc,
        type: input.type.trim() || undefined,
        status: input.status.trim(),
        reason: input.reason?.trim() || undefined,
        notes: input.notes?.trim() || undefined
    };
}

export function mapCreateAppointmentToApiBody(req: CreateAppointmentRequest): AppointmentCreateRequestDto {
    const type = req.type?.trim() ? req.type.trim() : null;
    const status = resolveAppointmentWriteStatus(req.status);
    const clinicId = req.clinicId?.trim() ? req.clinicId.trim() : '';
    const base: AppointmentCreateRequestDto = {
        clientId: req.clientId.trim(),
        petId: req.petId.trim(),
        scheduledAtUtc: req.scheduledAtUtc,
        type,
        // Geçici geri uyumluluk: bazı backend sürümleri `appointmentType` anahtarını bekleyebilir.
        appointmentType: type,
        status,
        lifecycleStatus: status,
        reason: req.reason?.trim() ? req.reason.trim() : null,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
    // Backend artık ClinicId olmadan da klinik resolve edebiliyor.
    // Kullanıcı klinik seçimi yaptığında (gelecekte) bu alan gönderilebilir; boşsa tamamen omit edilir.
    return clinicId ? { ...base, clinicId } : base;
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
