import { HttpParams } from '@angular/common/http';
import type {
    DischargeHospitalizationRequestDto,
    HospitalizationDetailDto,
    HospitalizationListItemDto,
    HospitalizationListItemDtoPagedResult,
    HospitalizationWriteRequestDto
} from '@/app/features/hospitalizations/models/hospitalization-api.model';
import type { CreateHospitalizationRequest } from '@/app/features/hospitalizations/models/hospitalization-create.model';
import type { HospitalizationsListQuery } from '@/app/features/hospitalizations/models/hospitalization-query.model';
import type {
    HospitalizationDetailVm,
    HospitalizationEditVm,
    HospitalizationListItemVm
} from '@/app/features/hospitalizations/models/hospitalization-vm.model';
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

function readDtoString(dto: HospitalizationListItemDto | HospitalizationDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function readDtoBoolean(dto: HospitalizationListItemDto | HospitalizationDetailDto, keys: string[]): boolean | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'boolean') {
            return v;
        }
        if (v === 'true' || v === true) {
            return true;
        }
        if (v === 'false' || v === false) {
            return false;
        }
    }
    return null;
}

function canonicalClinicId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.clinicId, readDtoString(dto, ['ClinicId']));
}

function canonicalClientId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.clientId, readDtoString(dto, ['ClientId', 'OwnerId']));
}

function canonicalClientName(dto: HospitalizationListItemDto | HospitalizationDetailDto): string {
    return str(firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName', 'OwnerName'])));
}

function canonicalPetId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.petId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function canonicalPetName(dto: HospitalizationListItemDto | HospitalizationDetailDto): string {
    const raw = firstTrimmed(dto.petName, readDtoString(dto, ['PetName', 'AnimalName']));
    return raw ?? '';
}

function canonicalExaminationId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.examinationId, readDtoString(dto, ['ExaminationId']));
}

function canonicalAdmittedAt(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.admittedAtUtc, readDtoString(dto, ['AdmittedAtUtc']));
}

function canonicalPlannedDischargeAt(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.plannedDischargeAtUtc, readDtoString(dto, ['PlannedDischargeAtUtc']));
}

function canonicalDischargedAt(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.dischargedAtUtc, readDtoString(dto, ['DischargedAtUtc']));
}

function canonicalReason(dto: HospitalizationListItemDto | HospitalizationDetailDto): string {
    return str(firstTrimmed(dto.reason, readDtoString(dto, ['Reason'])));
}

function canonicalNotes(dto: HospitalizationDetailDto): string {
    return str(firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])));
}

function canonicalCreatedAt(dto: HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.createdAtUtc, readDtoString(dto, ['CreatedAtUtc']));
}

function canonicalUpdatedAt(dto: HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.updatedAtUtc, readDtoString(dto, ['UpdatedAtUtc']));
}

function canonicalIsActive(dto: HospitalizationListItemDto | HospitalizationDetailDto): boolean {
    const explicit = readDtoBoolean(dto, ['isActive', 'IsActive']);
    if (explicit !== null) {
        return explicit;
    }
    return !canonicalDischargedAt(dto);
}

export function mapHospitalizationListItemDtoToVm(dto: HospitalizationListItemDto): HospitalizationListItemVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        examinationId: canonicalExaminationId(dto),
        admittedAtUtc: canonicalAdmittedAt(dto),
        plannedDischargeAtUtc: canonicalPlannedDischargeAt(dto),
        dischargedAtUtc: canonicalDischargedAt(dto),
        reason: canonicalReason(dto),
        isActive: canonicalIsActive(dto)
    };
}

export function mapHospitalizationDetailDtoToVm(dto: HospitalizationDetailDto): HospitalizationDetailVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        examinationId: canonicalExaminationId(dto),
        admittedAtUtc: canonicalAdmittedAt(dto),
        plannedDischargeAtUtc: canonicalPlannedDischargeAt(dto),
        dischargedAtUtc: canonicalDischargedAt(dto),
        reason: canonicalReason(dto),
        notes: canonicalNotes(dto),
        createdAtUtc: canonicalCreatedAt(dto),
        updatedAtUtc: canonicalUpdatedAt(dto),
        isActive: canonicalIsActive(dto)
    };
}

export function mapHospitalizationDetailDtoToEditVm(dto: HospitalizationDetailDto): HospitalizationEditVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto) ?? '',
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])),
        petName: firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])),
        examinationId: canonicalExaminationId(dto) ?? '',
        admittedAtUtc: canonicalAdmittedAt(dto),
        plannedDischargeAtUtc: canonicalPlannedDischargeAt(dto),
        reason: firstTrimmed(dto.reason, readDtoString(dto, ['Reason'])) ?? '',
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])) ?? '',
        isActive: canonicalIsActive(dto)
    };
}

export function mapPagedHospitalizationsToVm(result: HospitalizationListItemDtoPagedResult): {
    items: HospitalizationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapHospitalizationListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export function hospitalizationsQueryToHttpParams(query: HospitalizationsListQuery): HttpParams {
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
    if (query.activeOnly === true) {
        p = p.set('activeOnly', 'true');
    } else if (query.activeOnly === false) {
        p = p.set('activeOnly', 'false');
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

export function mapCreateHospitalizationToApiBody(req: CreateHospitalizationRequest): HospitalizationWriteRequestDto {
    const clinicId = req.clinicId.trim();
    const petId = req.petId.trim();
    if (!clinicId) {
        throw new Error('HOSPITALIZATION_WRITE_CLINIC_ID_REQUIRED');
    }
    if (!petId) {
        throw new Error('HOSPITALIZATION_WRITE_PET_ID_REQUIRED');
    }
    const admittedAtUtc = req.admittedAtUtc?.trim() ?? '';
    if (!admittedAtUtc) {
        throw new Error('HOSPITALIZATION_WRITE_ADMITTED_AT_REQUIRED');
    }
    const reason = req.reason.trim();
    if (!reason) {
        throw new Error('HOSPITALIZATION_WRITE_REASON_REQUIRED');
    }
    const planned = req.plannedDischargeAtUtc?.trim();
    const dto: HospitalizationWriteRequestDto = {
        clinicId,
        petId,
        admittedAtUtc,
        reason,
        plannedDischargeAtUtc: planned ? planned : null,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
    const ex = req.examinationId?.trim();
    if (ex) {
        dto.examinationId = ex;
    }
    return dto;
}

export interface HospitalizationUpsertFormAdapterInput {
    clinicId: string;
    petId: string;
    admittedAtUtc: string;
    plannedDischargeAtUtc?: string | null;
    reason: string;
    notes?: string | null;
    examinationId?: string | null;
}

export function mapHospitalizationUpsertFormToCreateRequest(
    input: HospitalizationUpsertFormAdapterInput
): CreateHospitalizationRequest {
    return {
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim(),
        admittedAtUtc: input.admittedAtUtc.trim(),
        plannedDischargeAtUtc: input.plannedDischargeAtUtc?.trim() ? input.plannedDischargeAtUtc.trim() : null,
        reason: input.reason.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : null,
        examinationId: input.examinationId?.trim() ? input.examinationId.trim() : null
    };
}

export function mapDischargeHospitalizationToApiBody(
    dischargedAtUtc: string,
    notes?: string | null
): DischargeHospitalizationRequestDto {
    const d = dischargedAtUtc.trim();
    if (!d) {
        throw new Error('HOSPITALIZATION_DISCHARGE_DATE_REQUIRED');
    }
    return {
        dischargedAtUtc: d,
        notes: notes?.trim() ? notes.trim() : null
    };
}
