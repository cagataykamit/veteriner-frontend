import { HttpParams } from '@angular/common/http';
import type {
    AppointmentCreateRequestDto,
    AppointmentDetailDto,
    AppointmentListItemDto,
    AppointmentListItemDtoPagedResult,
    AppointmentUpdateRequestDto
} from '@/app/features/appointments/models/appointment-api.model';
import type { CreateAppointmentRequest, UpdateAppointmentRequest } from '@/app/features/appointments/models/appointment-create.model';
import type { AppointmentsListQuery } from '@/app/features/appointments/models/appointment-query.model';
import type { AppointmentDetailVm, AppointmentEditVm, AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import {
    parseAppointmentTypeEnumValue,
    resolveAppointmentWriteTypeFormValue
} from '@/app/features/appointments/utils/appointment-type.utils';
import { parseAppointmentStatusRawToEnum } from '@/app/features/appointments/utils/appointment-status.utils';
import { dateOnlyInputToUtcIso, dateOnlyInputToUtcIsoEndOfDay } from '@/app/shared/utils/date.utils';

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

function canonicalNotesDetail(dto: AppointmentDetailDto): string {
    return firstTrimmed(dto.notes, readDtoString(dto, ['Notes'])) ?? '';
}

function readFirstScalarFromDto(o: Record<string, unknown>, keys: string[]): unknown {
    for (const k of keys) {
        if (!(k in o)) {
            continue;
        }
        const v = o[k];
        if (v === null || v === undefined) {
            continue;
        }
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && Number.isFinite(v) && !Number.isNaN(v)) {
            return v;
        }
    }
    return null;
}

/** Yalnızca `appointmentType` (int enum); eski `type` okunmaz. */
function readAppointmentTypeNumericFromDto(dto: AppointmentListItemDto | AppointmentDetailDto): number | null {
    const o = dto as unknown as Record<string, unknown>;
    const v = readFirstScalarFromDto(o, ['appointmentType', 'AppointmentType']);
    return parseAppointmentTypeEnumValue(v);
}

function readAppointmentTypeNameFromDto(dto: AppointmentListItemDto | AppointmentDetailDto): string | null {
    const o = dto as unknown as Record<string, unknown>;
    const v = o['appointmentTypeName'] ?? o['AppointmentTypeName'];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function readSpeciesNameFromDto(dto: AppointmentListItemDto | AppointmentDetailDto): string | null {
    const o = dto as unknown as Record<string, unknown>;
    const v = o['speciesName'] ?? o['SpeciesName'];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function readAppointmentStatusEnumFromDto(dto: AppointmentListItemDto | AppointmentDetailDto): number | null {
    const o = dto as unknown as Record<string, unknown>;
    const v = readFirstScalarFromDto(o, [
        'status',
        'Status',
        'state',
        'State',
        'appointmentStatus',
        'AppointmentStatus',
        'lifecycleStatus',
        'LifecycleStatus'
    ]);
    return parseAppointmentStatusRawToEnum(v);
}

function readAppointmentLifecycleEnumFromDto(dto: AppointmentListItemDto | AppointmentDetailDto): number | null {
    const o = dto as unknown as Record<string, unknown>;
    const v = readFirstScalarFromDto(o, ['lifecycleStatus', 'LifecycleStatus', 'lifecycle', 'Lifecycle']);
    return parseAppointmentStatusRawToEnum(v);
}

export function mapAppointmentListItemDtoToVm(dto: AppointmentListItemDto): AppointmentListItemVm {
    const typeNum = readAppointmentTypeNumericFromDto(dto);
    const typeName = readAppointmentTypeNameFromDto(dto);
    return {
        id: dto.id,
        scheduledAtUtc: dto.scheduledAtUtc ?? null,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        speciesName: readSpeciesNameFromDto(dto),
        appointmentType: typeNum,
        appointmentTypeName: typeName,
        status: readAppointmentStatusEnumFromDto(dto),
        lifecycleStatus: readAppointmentLifecycleEnumFromDto(dto)
    };
}

export function mapAppointmentDetailDtoToVm(dto: AppointmentDetailDto): AppointmentDetailVm {
    const typeNum = readAppointmentTypeNumericFromDto(dto);
    const typeName = readAppointmentTypeNameFromDto(dto);
    const scheduledAt = canonicalScheduledAtUtc(dto);
    const clientId = canonicalClientIdDetail(dto);
    const petId = canonicalPetIdDetail(dto);
    const notes = canonicalNotesDetail(dto);
    return {
        id: dto.id,
        scheduledAtUtc: scheduledAt,
        clientId: clientId?.trim() ? clientId : null,
        clientName: str(rawClientNameDetail(dto)),
        petId: petId?.trim() ? petId : null,
        petName: str(rawPetNameDetail(dto)),
        speciesName: readSpeciesNameFromDto(dto),
        appointmentType: typeNum,
        appointmentTypeName: typeName,
        status: readAppointmentStatusEnumFromDto(dto),
        lifecycleStatus: readAppointmentLifecycleEnumFromDto(dto),
        notes: notes.trim() ? notes : EM,
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
    };
}

export function mapAppointmentDetailDtoToEditVm(dto: AppointmentDetailDto): AppointmentEditVm {
    const typeNum = readAppointmentTypeNumericFromDto(dto);
    const typeName = readAppointmentTypeNameFromDto(dto);
    const clientId = canonicalClientIdDetail(dto) ?? '';
    const petId = canonicalPetIdDetail(dto) ?? '';
    return {
        id: dto.id,
        clientId,
        petId,
        clientName: rawClientNameDetail(dto),
        petName: rawPetNameDetail(dto),
        scheduledAtUtc: canonicalScheduledAtUtc(dto),
        appointmentType: resolveAppointmentWriteTypeFormValue(typeNum, typeName),
        status: readAppointmentStatusEnumFromDto(dto),
        notes: canonicalNotesDetail(dto)
    };
}

export interface AppointmentUpsertFormAdapterInput {
    clinicId: string;
    petId: string;
    scheduledAtUtc: string;
    appointmentType: number;
    status?: number | null;
    notes?: string;
}

export function mapAppointmentUpsertFormToCreateRequest(input: AppointmentUpsertFormAdapterInput): CreateAppointmentRequest {
    return {
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim(),
        scheduledAtUtc: input.scheduledAtUtc,
        appointmentType: input.appointmentType,
        status: input.status ?? undefined,
        notes: input.notes?.trim() || undefined
    };
}

export function mapCreateAppointmentToApiBody(req: CreateAppointmentRequest): AppointmentCreateRequestDto {
    const clinicId = req.clinicId?.trim() ? req.clinicId.trim() : '';
    const status = req.status;
    const statusParsed = status === null || status === undefined ? null : parseAppointmentStatusRawToEnum(status);
    const base: AppointmentCreateRequestDto = {
        petId: req.petId.trim(),
        scheduledAtUtc: req.scheduledAtUtc,
        appointmentType: req.appointmentType,
        ...(statusParsed === null ? {} : { status: statusParsed }),
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
    return clinicId ? { ...base, clinicId } : base;
}

export function mapAppointmentUpsertFormToUpdateRequest(id: string, input: AppointmentUpsertFormAdapterInput): UpdateAppointmentRequest {
    const statusParsed = parseAppointmentStatusRawToEnum(input.status);
    if (statusParsed === null) {
        throw new Error('Geçersiz randevu durumu (0–2 beklenir).');
    }
    return {
        id: id.trim(),
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim(),
        scheduledAtUtc: input.scheduledAtUtc,
        appointmentType: input.appointmentType,
        status: statusParsed,
        notes: input.notes?.trim() || undefined
    };
}

export function mapUpdateAppointmentToApiBody(req: UpdateAppointmentRequest): AppointmentUpdateRequestDto {
    const clinicId = req.clinicId?.trim() ? req.clinicId.trim() : '';
    const statusParsed = parseAppointmentStatusRawToEnum(req.status);
    if (statusParsed === null) {
        throw new Error('Geçersiz randevu durumu (0–2 beklenir).');
    }
    const base: AppointmentUpdateRequestDto = {
        id: req.id.trim(),
        petId: req.petId.trim(),
        scheduledAtUtc: req.scheduledAtUtc,
        appointmentType: req.appointmentType,
        status: statusParsed,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
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

/** Page, PageSize, search, clinicId, PetId, ClientId, Status, dateFromUtc, dateToUtc, Sort, Order */
export function appointmentsQueryToHttpParams(query: AppointmentsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('search', query.search.trim());
    }
    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }
    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }
    if (query.clientId?.trim()) {
        p = p.set('ClientId', query.clientId.trim());
    }
    if (query.status?.trim()) {
        p = p.set('Status', query.status.trim());
    }
    if (query.fromDate?.trim()) {
        const iso = dateOnlyInputToUtcIso(query.fromDate.trim());
        if (iso) {
            p = p.set('dateFromUtc', iso);
        }
    }
    if (query.toDate?.trim()) {
        const iso = dateOnlyInputToUtcIsoEndOfDay(query.toDate.trim());
        if (iso) {
            p = p.set('dateToUtc', iso);
        }
    }
    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }
    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }
    return p;
}

/** Status filtresi: API desteklemediğinde istemci tarafında uygulanır (`'0'|'1'|'2'`). */
export function filterAppointmentListByStatus(
    items: AppointmentListItemVm[],
    status: string | null | undefined
): AppointmentListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    const target = Number.parseInt(s, 10);
    if (!Number.isFinite(target) || target < 0 || target > 2) {
        return items;
    }
    return items.filter((i) => i.status === target);
}
