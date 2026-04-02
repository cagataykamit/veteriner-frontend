import { HttpParams } from '@angular/common/http';
import type {
    TreatmentDetailDto,
    TreatmentListItemDto,
    TreatmentListItemDtoPagedResult,
    TreatmentWriteRequestDto
} from '@/app/features/treatments/models/treatment-api.model';
import type { CreateTreatmentRequest } from '@/app/features/treatments/models/treatment-create.model';
import type { TreatmentsListQuery } from '@/app/features/treatments/models/treatment-query.model';
import type { TreatmentDetailVm, TreatmentEditVm, TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
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

function readDtoString(dto: TreatmentListItemDto | TreatmentDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function canonicalClinicId(dto: TreatmentListItemDto | TreatmentDetailDto): string | null {
    return firstTrimmed(dto.clinicId, readDtoString(dto, ['ClinicId']));
}

function canonicalClientId(dto: TreatmentListItemDto | TreatmentDetailDto): string | null {
    return firstTrimmed(dto.clientId, readDtoString(dto, ['ClientId', 'OwnerId']));
}

function canonicalClientName(dto: TreatmentListItemDto | TreatmentDetailDto): string {
    return str(firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName', 'OwnerName'])));
}

function canonicalPetId(dto: TreatmentListItemDto | TreatmentDetailDto): string | null {
    return firstTrimmed(dto.petId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function canonicalPetName(dto: TreatmentListItemDto | TreatmentDetailDto): string {
    const raw = firstTrimmed(dto.petName, readDtoString(dto, ['PetName', 'AnimalName']));
    return raw ?? '';
}

function canonicalTreatmentDate(dto: TreatmentListItemDto | TreatmentDetailDto): string | null {
    return firstTrimmed(dto.treatmentDateUtc, readDtoString(dto, ['TreatmentDateUtc', 'treatmentDateUtc']));
}

function canonicalTitle(dto: TreatmentListItemDto | TreatmentDetailDto): string {
    return str(firstTrimmed(dto.title, readDtoString(dto, ['Title'])));
}

function canonicalDescription(dto: TreatmentDetailDto): string {
    return str(firstTrimmed(dto.description, readDtoString(dto, ['Description'])));
}

function canonicalNotes(dto: TreatmentDetailDto): string {
    return str(firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])));
}

function canonicalExaminationId(dto: TreatmentListItemDto | TreatmentDetailDto): string | null {
    return firstTrimmed(dto.examinationId, readDtoString(dto, ['ExaminationId']));
}

function canonicalFollowUp(dto: TreatmentListItemDto | TreatmentDetailDto): string | null {
    return firstTrimmed(dto.followUpDateUtc, readDtoString(dto, ['FollowUpDateUtc']));
}

function canonicalCreatedAt(dto: TreatmentDetailDto): string | null {
    return firstTrimmed(dto.createdAtUtc, readDtoString(dto, ['CreatedAtUtc']));
}

function canonicalUpdatedAt(dto: TreatmentDetailDto): string | null {
    return firstTrimmed(dto.updatedAtUtc, readDtoString(dto, ['UpdatedAtUtc']));
}

export function mapTreatmentListItemDtoToVm(dto: TreatmentListItemDto): TreatmentListItemVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        treatmentDateUtc: canonicalTreatmentDate(dto),
        title: canonicalTitle(dto),
        examinationId: canonicalExaminationId(dto),
        followUpDateUtc: canonicalFollowUp(dto)
    };
}

export function mapTreatmentDetailDtoToVm(dto: TreatmentDetailDto): TreatmentDetailVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        examinationId: canonicalExaminationId(dto),
        treatmentDateUtc: canonicalTreatmentDate(dto),
        title: canonicalTitle(dto),
        description: canonicalDescription(dto),
        notes: canonicalNotes(dto),
        followUpDateUtc: canonicalFollowUp(dto),
        createdAtUtc: canonicalCreatedAt(dto),
        updatedAtUtc: canonicalUpdatedAt(dto)
    };
}

/** yyyy-MM-dd UTC günü — detaydan takip tarihi için. */
function followUpDateToInput(isoUtc: string | null): string {
    if (!isoUtc?.trim()) {
        return '';
    }
    const d = new Date(isoUtc);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function mapTreatmentDetailDtoToEditVm(dto: TreatmentDetailDto): TreatmentEditVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto) ?? '',
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])),
        petName: firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])),
        examinationId: canonicalExaminationId(dto) ?? '',
        treatmentDateUtc: canonicalTreatmentDate(dto),
        title: firstTrimmed(dto.title, readDtoString(dto, ['Title'])) ?? '',
        description: firstTrimmed(dto.description, readDtoString(dto, ['Description'])) ?? '',
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])) ?? '',
        followUpDateInput: followUpDateToInput(canonicalFollowUp(dto))
    };
}

export function mapPagedTreatmentsToVm(result: TreatmentListItemDtoPagedResult): {
    items: TreatmentListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapTreatmentListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export function treatmentsQueryToHttpParams(query: TreatmentsListQuery): HttpParams {
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

export function mapCreateTreatmentToApiBody(req: CreateTreatmentRequest): TreatmentWriteRequestDto {
    const clinicId = req.clinicId.trim();
    const petId = req.petId.trim();
    if (!clinicId) {
        throw new Error('TREATMENT_WRITE_CLINIC_ID_REQUIRED');
    }
    if (!petId) {
        throw new Error('TREATMENT_WRITE_PET_ID_REQUIRED');
    }
    const treatmentDateUtc = req.treatmentDateUtc?.trim() ?? '';
    if (!treatmentDateUtc) {
        throw new Error('TREATMENT_WRITE_DATE_REQUIRED');
    }
    const title = req.title.trim();
    const description = req.description.trim();
    if (!title) {
        throw new Error('TREATMENT_WRITE_TITLE_REQUIRED');
    }
    if (!description) {
        throw new Error('TREATMENT_WRITE_DESCRIPTION_REQUIRED');
    }
    const dto: TreatmentWriteRequestDto = {
        clinicId,
        petId,
        treatmentDateUtc,
        title,
        description,
        notes: req.notes?.trim() ? req.notes.trim() : null,
        followUpDateUtc: req.followUpDateUtc?.trim() ? req.followUpDateUtc.trim() : null
    };
    const ex = req.examinationId?.trim();
    if (ex) {
        dto.examinationId = ex;
    }
    return dto;
}

export interface TreatmentUpsertFormAdapterInput {
    clinicId: string;
    petId: string;
    treatmentDateUtc: string;
    title: string;
    description: string;
    notes?: string | null;
    followUpDateUtc?: string | null;
}

/** Create/edit formlarından gelen istek; `examinationId` UI’da toplanmıyor (gövdede alan yok). */
export function mapTreatmentUpsertFormToCreateRequest(input: TreatmentUpsertFormAdapterInput): CreateTreatmentRequest {
    return {
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim(),
        treatmentDateUtc: input.treatmentDateUtc.trim(),
        title: input.title.trim(),
        description: input.description.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : null,
        followUpDateUtc: input.followUpDateUtc?.trim() ? input.followUpDateUtc.trim() : null
    };
}

/** Takip tarihi (UTC anı) tedavi anından önce olamaz; boş follow-up için `null`. */
export function followUpBeforeTreatmentMessage(treatmentDateUtc: string, followUpDateUtc: string | null | undefined): string | null {
    if (!followUpDateUtc?.trim()) {
        return null;
    }
    const t = new Date(treatmentDateUtc.trim());
    const f = new Date(followUpDateUtc.trim());
    if (Number.isNaN(t.getTime()) || Number.isNaN(f.getTime())) {
        return null;
    }
    if (f.getTime() < t.getTime()) {
        return 'Takip tarihi tedavi tarihinden önce olamaz.';
    }
    return null;
}
