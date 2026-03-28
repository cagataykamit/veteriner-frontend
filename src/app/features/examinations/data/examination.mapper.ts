import { HttpParams } from '@angular/common/http';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';
import type {
    ExaminationCreateRequestDto,
    ExaminationDetailDto,
    ExaminationListItemDto,
    ExaminationListItemDtoPagedResult
} from '@/app/features/examinations/models/examination-api.model';
import type { CreateExaminationRequest } from '@/app/features/examinations/models/examination-create.model';
import type { ExaminationsListQuery } from '@/app/features/examinations/models/examination-query.model';
import type { ExaminationDetailVm, ExaminationEditVm, ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';

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

function readDtoString(dto: ExaminationListItemDto | ExaminationDetailDto, keys: string[]): string | null {
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

function canonicalClientId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.clientId, dto.ownerId, readDtoString(dto, ['ClientId', 'OwnerId', 'CustomerId', 'customerId']));
}

function canonicalClinicId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.clinicId);
}

function canonicalClinicName(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.clinicName);
}

function rawClientName(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    const nested = readNestedName(dto as unknown as Record<string, unknown>, ['client', 'Client', 'owner', 'Owner', 'customer', 'Customer'], [
        'name',
        'Name',
        'fullName',
        'FullName'
    ]);
    return firstTrimmed(
        dto.clientName,
        dto.ownerName,
        readDtoString(dto, ['ClientName', 'OwnerName', 'CustomerName', 'customerName']),
        nested
    );
}

function canonicalClientName(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(rawClientName(dto));
}

function canonicalPetId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.petId, dto.animalId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function rawPetName(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    const nested = readNestedName(dto as unknown as Record<string, unknown>, ['pet', 'Pet', 'animal', 'Animal'], [
        'name',
        'Name',
        'fullName',
        'FullName'
    ]);
    return firstTrimmed(
        dto.petName,
        dto.animalName,
        readDtoString(dto, ['PetName', 'AnimalName', 'PatientName', 'patientName']),
        nested
    );
}

function canonicalPetName(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(rawPetName(dto));
}

function canonicalStatus(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.status, dto.examinationStatus, dto.lifecycleStatus, dto.lifecycle);
}

function canonicalLifecycleStatus(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.lifecycleStatus, dto.lifecycle, dto.status, dto.examinationStatus);
}

function canonicalExaminedAt(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.examinedAtUtc, dto.examinationDateUtc);
}

function canonicalVisitReason(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.visitReason, dto.complaint, dto.complaintText));
}

function canonicalFindings(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.findings, dto.finding));
}

function canonicalAssessment(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.assessment, dto.diagnosis));
}

function canonicalNotes(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.notes, dto.note));
}

export function mapExaminationListItemDtoToVm(dto: ExaminationListItemDto): ExaminationListItemVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        clinicName: canonicalClinicName(dto),
        examinedAtUtc: canonicalExaminedAt(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        appointmentId: dto.appointmentId?.trim() ? dto.appointmentId : null,
        status: canonicalStatus(dto),
        lifecycleStatus: canonicalLifecycleStatus(dto),
        visitReason: canonicalVisitReason(dto),
        createdAtUtc: dto.createdAtUtc ?? null
    };
}

export function mapExaminationDetailDtoToVm(dto: ExaminationDetailDto): ExaminationDetailVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        clinicName: canonicalClinicName(dto),
        examinedAtUtc: canonicalExaminedAt(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        appointmentId: dto.appointmentId?.trim() ? dto.appointmentId : null,
        status: canonicalStatus(dto),
        lifecycleStatus: canonicalLifecycleStatus(dto),
        visitReason: canonicalVisitReason(dto),
        notes: canonicalNotes(dto),
        findings: canonicalFindings(dto),
        assessment: canonicalAssessment(dto),
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
    };
}

export function mapExaminationDetailDtoToEditVm(dto: ExaminationDetailDto): ExaminationEditVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto) ?? '',
        clinicName: canonicalClinicName(dto) ?? '',
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: rawClientName(dto),
        petName: rawPetName(dto),
        examinedAtUtc: canonicalExaminedAt(dto),
        visitReason: firstTrimmed(dto.visitReason, dto.complaint, dto.complaintText) ?? '',
        notes: firstTrimmed(dto.notes, dto.note) ?? '',
        findings: firstTrimmed(dto.findings, dto.finding) ?? '',
        assessment: firstTrimmed(dto.assessment, dto.diagnosis) ?? ''
    };
}

export function mapPagedExaminationsToVm(result: ExaminationListItemDtoPagedResult): {
    items: ExaminationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapExaminationListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** Page, PageSize, Search, Status, FromDate, ToDate, Sort, Order */
export function examinationsQueryToHttpParams(query: ExaminationsListQuery): HttpParams {
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

export function mapCreateExaminationToApiBody(req: CreateExaminationRequest): ExaminationCreateRequestDto {
    return {
        appointmentId: req.appointmentId?.trim() ? req.appointmentId.trim() : null,
        clinicId: req.clinicId?.trim() ? req.clinicId.trim() : null,
        petId: req.petId?.trim() ? req.petId.trim() : null,
        examinedAtUtc: req.examinedAtUtc,
        visitReason: req.visitReason.trim(),
        findings: req.findings.trim(),
        assessment: req.assessment?.trim() ? req.assessment.trim() : null,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
}

export interface ExaminationUpsertFormAdapterInput {
    clinicId: string;
    petId: string;
    examinedAtUtc: string;
    visitReason: string;
    findings: string;
    assessment?: string | null;
    notes?: string | null;
}

export function mapExaminationUpsertFormToCreateRequest(input: ExaminationUpsertFormAdapterInput): CreateExaminationRequest {
    return {
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim() || undefined,
        examinedAtUtc: input.examinedAtUtc,
        visitReason: input.visitReason.trim(),
        findings: input.findings.trim(),
        assessment: input.assessment?.trim() ? input.assessment.trim() : null,
        notes: input.notes?.trim() ? input.notes.trim() : null
    };
}

/** Status filtresi: API desteklemediğinde istemci tarafında uygulanır. */
export function filterExaminationListByStatus(
    items: ExaminationListItemVm[],
    status: string | null | undefined
): ExaminationListItemVm[] {
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
