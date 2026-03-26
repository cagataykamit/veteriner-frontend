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

function canonicalClientId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.clientId, dto.ownerId);
}

function canonicalClientName(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.clientName, dto.ownerName));
}

function canonicalPetId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.petId, dto.animalId);
}

function canonicalPetName(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.petName, dto.animalName));
}

function canonicalStatus(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.status, dto.examinationStatus, dto.lifecycleStatus, dto.lifecycle);
}

function canonicalLifecycleStatus(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.lifecycleStatus, dto.lifecycle, dto.status, dto.examinationStatus);
}

function canonicalComplaint(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.complaint, dto.complaintText));
}

export function mapExaminationListItemDtoToVm(dto: ExaminationListItemDto): ExaminationListItemVm {
    return {
        id: dto.id,
        examinationDateUtc: dto.examinationDateUtc ?? null,
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        appointmentId: dto.appointmentId?.trim() ? dto.appointmentId : null,
        status: canonicalStatus(dto),
        lifecycleStatus: canonicalLifecycleStatus(dto),
        complaint: canonicalComplaint(dto),
        createdAtUtc: dto.createdAtUtc ?? null
    };
}

export function mapExaminationDetailDtoToVm(dto: ExaminationDetailDto): ExaminationDetailVm {
    return {
        id: dto.id,
        examinationDateUtc: dto.examinationDateUtc ?? null,
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        appointmentId: dto.appointmentId?.trim() ? dto.appointmentId : null,
        status: canonicalStatus(dto),
        lifecycleStatus: canonicalLifecycleStatus(dto),
        complaint: canonicalComplaint(dto),
        notes: str(firstTrimmed(dto.notes, dto.note)),
        findings: str(firstTrimmed(dto.findings, dto.finding)),
        diagnosis: str(dto.diagnosis),
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
    };
}

export function mapExaminationDetailDtoToEditVm(dto: ExaminationDetailDto): ExaminationEditVm {
    return {
        id: dto.id,
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        examinationDateUtc: dto.examinationDateUtc ?? null,
        status: canonicalStatus(dto) ?? 'draft',
        complaint: firstTrimmed(dto.complaint, dto.complaintText) ?? '',
        notes: firstTrimmed(dto.notes, dto.note) ?? '',
        findings: firstTrimmed(dto.findings, dto.finding) ?? '',
        diagnosis: dto.diagnosis?.trim() ?? ''
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
