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
import type { ExaminationDetailVm, ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

export function mapExaminationListItemDtoToVm(dto: ExaminationListItemDto): ExaminationListItemVm {
    return {
        id: dto.id,
        examinationDateUtc: dto.examinationDateUtc ?? null,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        status: dto.status?.trim() ? dto.status : null,
        complaint: str(dto.complaint),
        createdAtUtc: dto.createdAtUtc ?? null
    };
}

export function mapExaminationDetailDtoToVm(dto: ExaminationDetailDto): ExaminationDetailVm {
    return {
        id: dto.id,
        examinationDateUtc: dto.examinationDateUtc ?? null,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        clientName: str(dto.clientName),
        petId: dto.petId?.trim() ? dto.petId : null,
        petName: str(dto.petName),
        status: dto.status?.trim() ? dto.status : null,
        complaint: str(dto.complaint),
        notes: str(dto.notes),
        findings: str(dto.findings),
        diagnosis: str(dto.diagnosis),
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
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

export function mapCreateExaminationToApiBody(req: CreateExaminationRequest): ExaminationCreateRequestDto {
    return {
        clientId: req.clientId.trim(),
        petId: req.petId.trim(),
        examinationDateUtc: req.examinationDateUtc,
        complaint: req.complaint?.trim() ? req.complaint.trim() : null,
        notes: req.notes?.trim() ? req.notes.trim() : null,
        findings: req.findings?.trim() ? req.findings.trim() : null,
        diagnosis: req.diagnosis?.trim() ? req.diagnosis.trim() : null
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
