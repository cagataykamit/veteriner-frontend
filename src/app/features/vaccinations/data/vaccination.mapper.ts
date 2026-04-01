import { HttpParams } from '@angular/common/http';
import type {
    VaccinationCreateRequestDto,
    VaccinationDetailDto,
    VaccinationListItemDto,
    VaccinationListItemDtoPagedResult,
    VaccinationUpdateRequestDto
} from '@/app/features/vaccinations/models/vaccination-api.model';
import type { CreateVaccinationRequest, UpdateVaccinationRequest } from '@/app/features/vaccinations/models/vaccination-create.model';
import type { VaccinationsListQuery } from '@/app/features/vaccinations/models/vaccination-query.model';
import type { VaccinationDetailVm, VaccinationEditVm, VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { parseVaccinationStatusRawToEnum } from '@/app/features/vaccinations/utils/vaccination-status.utils';

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

function readDtoString(dto: VaccinationListItemDto | VaccinationDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function canonicalAppliedAt(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    return firstTrimmed(
        dto.appliedAtUtc,
        readDtoString(dto, ['AppliedAtUtc'])
    );
}

function canonicalDueAt(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    const o = dto as unknown as Record<string, unknown>;
    const nextRaw = o['nextDueAtUtc'] ?? o['NextDueAtUtc'];
    const nextDue = typeof nextRaw === 'string' && nextRaw.trim() ? nextRaw.trim() : null;
    return firstTrimmed(dto.dueAtUtc, readDtoString(dto, ['DueAtUtc']), nextDue);
}

function canonicalVaccineName(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.vaccineName, readDtoString(dto, ['VaccineName'])));
}

function canonicalPetId(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    return firstTrimmed(dto.petId, readDtoString(dto, ['PetId']));
}

function canonicalPetName(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])));
}

function canonicalClientId(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    return firstTrimmed(dto.clientId, readDtoString(dto, ['ClientId']));
}

function canonicalClientName(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])));
}

function canonicalStatus(dto: VaccinationListItemDto | VaccinationDetailDto): number | null {
    const raw = dto.status ?? readDtoString(dto, ['Status']);
    return parseVaccinationStatusRawToEnum(raw);
}

function canonicalNotes(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.notes, readDtoString(dto, ['Notes'])));
}

function canonicalCreatedAt(dto: VaccinationDetailDto): string | null {
    return firstTrimmed(dto.createdAtUtc, readDtoString(dto, ['CreatedAtUtc']));
}

function canonicalUpdatedAt(dto: VaccinationDetailDto): string | null {
    return firstTrimmed(dto.updatedAtUtc, readDtoString(dto, ['UpdatedAtUtc']));
}

export function mapVaccinationListItemDtoToVm(dto: VaccinationListItemDto): VaccinationListItemVm {
    return {
        id: dto.id,
        appliedAtUtc: canonicalAppliedAt(dto),
        dueAtUtc: canonicalDueAt(dto),
        vaccineName: canonicalVaccineName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        status: canonicalStatus(dto),
        notes: canonicalNotes(dto)
    };
}

/** GET /vaccinations/{id} — liste öğesi ile aynı çekirdek eşleme + audit. */
export function mapVaccinationDetailDtoToVm(dto: VaccinationDetailDto): VaccinationDetailVm {
    const base = mapVaccinationListItemDtoToVm(dto);
    return {
        ...base,
        createdAtUtc: canonicalCreatedAt(dto),
        updatedAtUtc: canonicalUpdatedAt(dto)
    };
}

/** Detay → edit: `clientId` / `petId` canonical; backend camelCase veya OwnerId/PetId vb. */
export function mapVaccinationDetailDtoToEditVm(dto: VaccinationDetailDto): VaccinationEditVm {
    const status = canonicalStatus(dto);
    return {
        id: dto.id,
        clinicId: dto.clinicId?.trim() ?? '',
        examinationId: dto.examinationId?.trim() ? dto.examinationId.trim() : null,
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])),
        petName: firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])),
        vaccineName: firstTrimmed(dto.vaccineName, readDtoString(dto, ['VaccineName'])) ?? '',
        appliedAtUtc: canonicalAppliedAt(dto),
        dueAtUtc: canonicalDueAt(dto),
        status,
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['Notes'])) ?? ''
    };
}

/**
 * POST /vaccinations gövdesi.
 * Geçiş dönemi uyumluluğu için canonical ve alternatif alan adları birlikte gönderilir.
 */
export function mapCreateVaccinationToApiBody(req: CreateVaccinationRequest): VaccinationCreateRequestDto {
    const clinicId = req.clinicId.trim();
    if (!clinicId) {
        throw new Error('VACCINATION_WRITE_CLINIC_REQUIRED');
    }
    const examinationId = req.examinationId?.trim() ? req.examinationId.trim() : null;
    const notes = req.notes?.trim() ? req.notes.trim() : null;
    const status = toVaccinationStatusEnumOrThrow(req.status);
    const dueAtUtc = req.dueAtUtc?.trim() ? req.dueAtUtc.trim() : null;
    const appliedAtUtc = req.appliedAtUtc?.trim() ? req.appliedAtUtc.trim() : null;
    return {
        clinicId,
        examinationId,
        petId: req.petId.trim(),
        vaccineName: req.vaccineName.trim(),
        status,
        appliedAtUtc,
        dueAtUtc,
        notes
    };
}

export function mapUpdateVaccinationToApiBody(routeId: string, req: UpdateVaccinationRequest): VaccinationUpdateRequestDto {
    const clinicId = req.clinicId.trim();
    if (!clinicId) {
        throw new Error('VACCINATION_WRITE_CLINIC_REQUIRED');
    }
    const status = toVaccinationStatusEnumOrThrow(req.status);
    const bodyId = req.id?.trim();
    if (bodyId && bodyId !== routeId.trim()) {
        throw new Error('VACCINATION_WRITE_ID_MISMATCH');
    }
    return {
        ...(bodyId ? { id: bodyId } : {}),
        clinicId,
        petId: req.petId.trim(),
        examinationId: req.examinationId?.trim() ? req.examinationId.trim() : null,
        vaccineName: req.vaccineName.trim(),
        status,
        appliedAtUtc: req.appliedAtUtc?.trim() ? req.appliedAtUtc.trim() : null,
        dueAtUtc: req.dueAtUtc?.trim() ? req.dueAtUtc.trim() : null,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
}

function toVaccinationStatusEnumOrThrow(status: number): number {
    const parsed = parseVaccinationStatusRawToEnum(status);
    if (parsed !== null) {
        return parsed;
    }
    throw new Error('VACCINATION_WRITE_STATUS_UNSUPPORTED');
}

export function mapPagedVaccinationsToVm(result: VaccinationListItemDtoPagedResult): {
    items: VaccinationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapVaccinationListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** Page, PageSize, search, Status, FromDate, ToDate, Sort, Order */
export function vaccinationsQueryToHttpParams(query: VaccinationsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('search', query.search.trim());
    }
    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }
    if (query.clientId?.trim()) {
        const clientId = query.clientId.trim();
        p = p.set('ClientId', clientId);
    }
    if (query.status?.trim()) {
        const status = query.status.trim();
        p = p.set('Status', status);
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

/** Status filtresi: API desteklemediğinde istemci tarafında uygulanır (normalize ile eşleşir). */
export function filterVaccinationListByStatus(
    items: VaccinationListItemVm[],
    status: string | null | undefined
): VaccinationListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    const target = parseVaccinationStatusRawToEnum(s);
    if (target === null) {
        return items;
    }
    return items.filter((i) => {
        return i.status === target;
    });
}
