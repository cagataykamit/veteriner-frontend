import { HttpParams } from '@angular/common/http';
import type {
    PrescriptionDetailDto,
    PrescriptionListItemDto,
    PrescriptionListItemDtoPagedResult,
    PrescriptionWriteRequestDto
} from '@/app/features/prescriptions/models/prescription-api.model';
import type { CreatePrescriptionRequest } from '@/app/features/prescriptions/models/prescription-create.model';
import type { PrescriptionsListQuery } from '@/app/features/prescriptions/models/prescription-query.model';
import type { PrescriptionDetailVm, PrescriptionEditVm, PrescriptionListItemVm } from '@/app/features/prescriptions/models/prescription-vm.model';
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

function readDtoString(dto: PrescriptionListItemDto | PrescriptionDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function canonicalClinicId(dto: PrescriptionListItemDto | PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.clinicId, readDtoString(dto, ['ClinicId']));
}

function canonicalClientId(dto: PrescriptionListItemDto | PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.clientId, readDtoString(dto, ['ClientId', 'OwnerId']));
}

function canonicalClientName(dto: PrescriptionListItemDto | PrescriptionDetailDto): string {
    return str(firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName', 'OwnerName'])));
}

function canonicalPetId(dto: PrescriptionListItemDto | PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.petId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function canonicalPetName(dto: PrescriptionListItemDto | PrescriptionDetailDto): string {
    const raw = firstTrimmed(dto.petName, readDtoString(dto, ['PetName', 'AnimalName']));
    return raw ?? '';
}

function canonicalPrescribedAt(dto: PrescriptionListItemDto | PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.prescribedAtUtc, readDtoString(dto, ['PrescribedAtUtc', 'prescribedAtUtc']));
}

function canonicalTitle(dto: PrescriptionListItemDto | PrescriptionDetailDto): string {
    return str(firstTrimmed(dto.title, readDtoString(dto, ['Title'])));
}

function canonicalContent(dto: PrescriptionDetailDto): string {
    return str(firstTrimmed(dto.content, readDtoString(dto, ['Content'])));
}

function canonicalNotes(dto: PrescriptionDetailDto): string {
    return str(firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])));
}

function canonicalExaminationId(dto: PrescriptionListItemDto | PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.examinationId, readDtoString(dto, ['ExaminationId']));
}

function canonicalTreatmentId(dto: PrescriptionListItemDto | PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.treatmentId, readDtoString(dto, ['TreatmentId']));
}

function canonicalFollowUp(dto: PrescriptionListItemDto | PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.followUpDateUtc, readDtoString(dto, ['FollowUpDateUtc']));
}

function canonicalCreatedAt(dto: PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.createdAtUtc, readDtoString(dto, ['CreatedAtUtc']));
}

function canonicalUpdatedAt(dto: PrescriptionDetailDto): string | null {
    return firstTrimmed(dto.updatedAtUtc, readDtoString(dto, ['UpdatedAtUtc']));
}

export function mapPrescriptionListItemDtoToVm(dto: PrescriptionListItemDto): PrescriptionListItemVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        prescribedAtUtc: canonicalPrescribedAt(dto),
        title: canonicalTitle(dto),
        examinationId: canonicalExaminationId(dto),
        treatmentId: canonicalTreatmentId(dto),
        followUpDateUtc: canonicalFollowUp(dto)
    };
}

export function mapPrescriptionDetailDtoToVm(dto: PrescriptionDetailDto): PrescriptionDetailVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        examinationId: canonicalExaminationId(dto),
        treatmentId: canonicalTreatmentId(dto),
        prescribedAtUtc: canonicalPrescribedAt(dto),
        title: canonicalTitle(dto),
        content: canonicalContent(dto),
        notes: canonicalNotes(dto),
        followUpDateUtc: canonicalFollowUp(dto),
        createdAtUtc: canonicalCreatedAt(dto),
        updatedAtUtc: canonicalUpdatedAt(dto)
    };
}

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

export function mapPrescriptionDetailDtoToEditVm(dto: PrescriptionDetailDto): PrescriptionEditVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto) ?? '',
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])),
        petName: firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])),
        examinationId: canonicalExaminationId(dto) ?? '',
        treatmentId: canonicalTreatmentId(dto) ?? '',
        prescribedAtUtc: canonicalPrescribedAt(dto),
        title: firstTrimmed(dto.title, readDtoString(dto, ['Title'])) ?? '',
        content: firstTrimmed(dto.content, readDtoString(dto, ['Content'])) ?? '',
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])) ?? '',
        followUpDateInput: followUpDateToInput(canonicalFollowUp(dto))
    };
}

export function mapPagedPrescriptionsToVm(result: PrescriptionListItemDtoPagedResult): {
    items: PrescriptionListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapPrescriptionListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export function prescriptionsQueryToHttpParams(query: PrescriptionsListQuery): HttpParams {
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

export function mapCreatePrescriptionToApiBody(req: CreatePrescriptionRequest): PrescriptionWriteRequestDto {
    const clinicId = req.clinicId.trim();
    const petId = req.petId.trim();
    if (!clinicId) {
        throw new Error('PRESCRIPTION_WRITE_CLINIC_ID_REQUIRED');
    }
    if (!petId) {
        throw new Error('PRESCRIPTION_WRITE_PET_ID_REQUIRED');
    }
    const prescribedAtUtc = req.prescribedAtUtc?.trim() ?? '';
    if (!prescribedAtUtc) {
        throw new Error('PRESCRIPTION_WRITE_DATE_REQUIRED');
    }
    const title = req.title.trim();
    const content = req.content.trim();
    if (!title) {
        throw new Error('PRESCRIPTION_WRITE_TITLE_REQUIRED');
    }
    if (!content) {
        throw new Error('PRESCRIPTION_WRITE_CONTENT_REQUIRED');
    }
    const dto: PrescriptionWriteRequestDto = {
        clinicId,
        petId,
        prescribedAtUtc,
        title,
        content,
        notes: req.notes?.trim() ? req.notes.trim() : null,
        followUpDateUtc: req.followUpDateUtc?.trim() ? req.followUpDateUtc.trim() : null
    };
    const ex = req.examinationId?.trim();
    if (ex) {
        dto.examinationId = ex;
    }
    const tr = req.treatmentId?.trim();
    if (tr) {
        dto.treatmentId = tr;
    }
    return dto;
}

export interface PrescriptionUpsertFormAdapterInput {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    treatmentId?: string | null;
    prescribedAtUtc: string;
    title: string;
    content: string;
    notes?: string | null;
    followUpDateUtc?: string | null;
}

export function mapPrescriptionUpsertFormToCreateRequest(input: PrescriptionUpsertFormAdapterInput): CreatePrescriptionRequest {
    return {
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim(),
        examinationId: input.examinationId?.trim() ? input.examinationId.trim() : null,
        treatmentId: input.treatmentId?.trim() ? input.treatmentId.trim() : null,
        prescribedAtUtc: input.prescribedAtUtc.trim(),
        title: input.title.trim(),
        content: input.content.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : null,
        followUpDateUtc: input.followUpDateUtc?.trim() ? input.followUpDateUtc.trim() : null
    };
}

/** Takip tarihi reçete anından önce olamaz. */
export function followUpBeforePrescribedMessage(prescribedAtUtc: string, followUpDateUtc: string | null | undefined): string | null {
    if (!followUpDateUtc?.trim()) {
        return null;
    }
    const t = new Date(prescribedAtUtc.trim());
    const f = new Date(followUpDateUtc.trim());
    if (Number.isNaN(t.getTime()) || Number.isNaN(f.getTime())) {
        return null;
    }
    if (f.getTime() < t.getTime()) {
        return 'Takip tarihi reçete tarihinden önce olamaz.';
    }
    return null;
}
