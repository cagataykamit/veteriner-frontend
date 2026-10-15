import { HttpParams } from '@angular/common/http';
import type {
    LabResultDetailDto,
    LabResultListItemDto,
    LabResultListItemDtoPagedResult,
    LabResultWriteRequestDto
} from '@/app/features/lab-results/models/lab-result-api.model';
import type { CreateLabResultRequest } from '@/app/features/lab-results/models/lab-result-create.model';
import type { LabResultsListQuery } from '@/app/features/lab-results/models/lab-result-query.model';
import { parseLabResultStatus } from '@/app/features/lab-results/utils/lab-result-status.utils';
import type { LabResultDetailVm, LabResultEditVm, LabResultListItemVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import { dateOnlyInputToIstanbulEndUtcIso, dateOnlyInputToIstanbulStartUtcIso } from '@/app/shared/utils/date.utils';

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

function readDtoString(dto: LabResultListItemDto | LabResultDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;

    for (const k of keys) {
        const v = o[k];

        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }

    return null;
}

function canonicalClinicId(dto: LabResultListItemDto | LabResultDetailDto): string | null {
    return firstTrimmed(dto.clinicId, readDtoString(dto, ['ClinicId']));
}

function canonicalClientId(dto: LabResultListItemDto | LabResultDetailDto): string | null {
    return firstTrimmed(dto.clientId, readDtoString(dto, ['ClientId', 'OwnerId']));
}

function canonicalClientName(dto: LabResultListItemDto | LabResultDetailDto): string {
    return str(firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName', 'OwnerName'])));
}

function canonicalPetId(dto: LabResultListItemDto | LabResultDetailDto): string | null {
    return firstTrimmed(dto.petId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function canonicalPetName(dto: LabResultListItemDto | LabResultDetailDto): string {
    const raw = firstTrimmed(dto.petName, readDtoString(dto, ['PetName', 'AnimalName']));

    return raw ?? '';
}

function canonicalResultDate(dto: LabResultListItemDto | LabResultDetailDto): string | null {
    return firstTrimmed(dto.resultDateUtc, readDtoString(dto, ['ResultDateUtc']));
}

function canonicalTestName(dto: LabResultListItemDto | LabResultDetailDto): string {
    return str(firstTrimmed(dto.testName, readDtoString(dto, ['TestName'])));
}

function canonicalExaminationId(dto: LabResultListItemDto | LabResultDetailDto): string | null {
    return firstTrimmed(dto.examinationId, readDtoString(dto, ['ExaminationId']));
}

function canonicalResultText(dto: LabResultDetailDto): string | null {
    return firstTrimmed(dto.resultText, readDtoString(dto, ['ResultText']));
}

function canonicalInterpretation(dto: LabResultDetailDto): string {
    return str(firstTrimmed(dto.interpretation, readDtoString(dto, ['Interpretation'])));
}

function canonicalNotes(dto: LabResultDetailDto): string {
    return str(firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])));
}

function canonicalCreatedAt(dto: LabResultDetailDto): string | null {
    return firstTrimmed(dto.createdAtUtc, readDtoString(dto, ['CreatedAtUtc']));
}

function canonicalUpdatedAt(dto: LabResultDetailDto): string | null {
    return firstTrimmed(dto.updatedAtUtc, readDtoString(dto, ['UpdatedAtUtc']));
}

export function mapLabResultListItemDtoToVm(dto: LabResultListItemDto): LabResultListItemVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        resultDateUtc: canonicalResultDate(dto),
        requestedAtUtc: canonicalRequestedAt(dto),
        status: parseLabResultStatus(dto.status),
        awaitingInterpretation: dto.awaitingInterpretation === true,
        testName: canonicalTestName(dto),
        examinationId: canonicalExaminationId(dto)
    };
}

export function mapLabResultDetailDtoToVm(dto: LabResultDetailDto): LabResultDetailVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        examinationId: canonicalExaminationId(dto),
        resultDateUtc: canonicalResultDate(dto),
        requestedAtUtc: canonicalRequestedAt(dto),
        status: parseLabResultStatus(dto.status),
        awaitingInterpretation: dto.awaitingInterpretation === true,
        testName: canonicalTestName(dto),
        resultText: canonicalResultText(dto),
        interpretation: canonicalInterpretation(dto),
        notes: canonicalNotes(dto),
        createdAtUtc: canonicalCreatedAt(dto),
        updatedAtUtc: canonicalUpdatedAt(dto),
        cancelledAtUtc: firstTrimmed(dto.cancelledAtUtc),
        cancelReason: firstTrimmed(dto.cancelReason),
        rowVersion: firstTrimmed(dto.rowVersion) ?? ''
    };
}

export function mapLabResultDetailDtoToEditVm(dto: LabResultDetailDto): LabResultEditVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto) ?? '',
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])),
        petName: firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])),
        examinationId: canonicalExaminationId(dto) ?? '',
        status: parseLabResultStatus(dto.status),
        resultDateUtc: canonicalResultDate(dto),
        testName: firstTrimmed(dto.testName, readDtoString(dto, ['TestName'])) ?? '',
        resultText: firstTrimmed(dto.resultText, readDtoString(dto, ['ResultText'])) ?? '',
        interpretation: firstTrimmed(dto.interpretation, readDtoString(dto, ['Interpretation'])) ?? '',
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])) ?? '',
        rowVersion: firstTrimmed(dto.rowVersion, readDtoString(dto, ['RowVersion'])) ?? ''
    };
}

export function mapPagedLabResultsToVm(result: LabResultListItemDtoPagedResult): {
    items: LabResultListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapLabResultListItemDtoToVm);

    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/**
 * GET `/api/v1/lab-results` — canonical query:
 * `Page`, `PageSize`, `Search`, `Status`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order` (+ `clinicId`, `PetId`).
 * Backend `requestedAtUtc >= dateFromUtc` ve `<= dateToUtc` (iki uç dahil); İstanbul günü başı ve günü sonu (23:59:59.999) gönderilir.
 */
export function labResultsQueryToHttpParams(query: LabResultsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));

    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }

    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }

    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }

    if (query.status) {
        p = p.set('Status', query.status);
    }

    const fromUtc = query.fromDate?.trim() ? dateOnlyInputToIstanbulStartUtcIso(query.fromDate.trim()) : '';

    if (fromUtc) {
        p = p.set('dateFromUtc', fromUtc);
    }

    const toUtc = query.toDate?.trim() ? dateOnlyInputToIstanbulEndUtcIso(query.toDate.trim()) : '';

    if (toUtc) {
        p = p.set('dateToUtc', toUtc);
    }

    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }

    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }

    return p;
}

export function mapCreateLabResultToApiBody(req: CreateLabResultRequest): LabResultWriteRequestDto {
    const clinicId = req.clinicId.trim();
    const petId = req.petId.trim();

    if (!clinicId) {
        throw new Error('LAB_RESULT_WRITE_CLINIC_ID_REQUIRED');
    }

    if (!petId) {
        throw new Error('LAB_RESULT_WRITE_PET_ID_REQUIRED');
    }

    const testName = req.testName.trim();

    if (!testName) {
        throw new Error('LAB_RESULT_WRITE_TEST_NAME_REQUIRED');
    }

    // Sonuç tarihi ve metni birlikte verilir ya da birlikte verilmez (ikisi de yok → `Requested` istem).
    const resultDateUtc = req.resultDateUtc?.trim() ?? '';
    const resultText = req.resultText?.trim() ?? '';

    if (!resultDateUtc !== !resultText) {
        throw new Error('LAB_RESULT_WRITE_RESULT_INCOMPLETE');
    }

    const dto: LabResultWriteRequestDto = {
        clinicId,
        petId,
        resultDateUtc: resultDateUtc || null,
        testName,
        resultText: resultText || null,
        interpretation: req.interpretation?.trim() ? req.interpretation.trim() : null,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
    const ex = req.examinationId?.trim();

    if (ex) {
        dto.examinationId = ex;
    }

    const rowVersion = req.rowVersion?.trim();

    if (rowVersion) {
        dto.rowVersion = rowVersion;
    }

    return dto;
}

export interface LabResultUpsertFormAdapterInput {
    clinicId: string;
    petId: string;
    resultDateUtc?: string | null;
    testName: string;
    resultText?: string | null;
    interpretation?: string | null;
    notes?: string | null;
    examinationId?: string | null;
    rowVersion?: string;
}

export function mapLabResultUpsertFormToCreateRequest(input: LabResultUpsertFormAdapterInput): CreateLabResultRequest {
    return {
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim(),
        resultDateUtc: input.resultDateUtc?.trim() ?? null,
        testName: input.testName.trim(),
        resultText: input.resultText?.trim() ?? null,
        interpretation: input.interpretation?.trim() ? input.interpretation.trim() : null,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        examinationId: input.examinationId?.trim() ? input.examinationId.trim() : null,
        rowVersion: input.rowVersion
    };
}

function canonicalRequestedAt(dto: LabResultListItemDto | LabResultDetailDto): string | null {
    return firstTrimmed(dto.requestedAtUtc, readDtoString(dto, ['RequestedAtUtc']));
}
