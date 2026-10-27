import { HttpParams } from '@angular/common/http';
import { mapAdministrationCreateResultDtoToVm } from '@/app/entities/administration/data/administration.mapper';
import type { AdministrationCreateResultDto } from '@/app/entities/administration/models/administration-api.model';
import { mapHbsEntryDtoToVm, parseHbsStatus } from '@/app/features/hbs/utils/hbs-status.utils';
import { toYmdOrNull } from '@/app/entities/inventory/utils/stock-batch-expiry.utils';
import type {
    VaccinationCreateRequestDto,
    VaccinationDetailDto,
    VaccinationListItemDto,
    VaccinationListItemDtoPagedResult,
    VaccinationUpdateRequestDto
} from '@/app/features/vaccinations/models/vaccination-api.model';
import type { CreateVaccinationRequest, UpdateVaccinationRequest } from '@/app/features/vaccinations/models/vaccination-create.model';
import type { VaccinationsListQuery } from '@/app/features/vaccinations/models/vaccination-query.model';
import type {
    VaccinationCreateResultVm,
    VaccinationDetailVm,
    VaccinationEditVm,
    VaccinationLinkedAdministrationVm,
    VaccinationListItemVm
} from '@/app/features/vaccinations/models/vaccination-vm.model';
import { parseVaccinationStatusRawToEnum } from '@/app/features/vaccinations/utils/vaccination-status.utils';
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

function canonicalVaccineDefinitionId(dto: VaccinationDetailDto): string | null {
    return firstTrimmed(
        dto.vaccineDefinitionId as string | undefined,
        readDtoString(dto, ['VaccineDefinitionId'])
    );
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
        notes: canonicalNotes(dto),
        administrationId: firstTrimmed(dto.administrationId),
        hbsStatus: parseHbsStatus(dto.hbsStatus)
    };
}

function mapLinkedAdministration(dto: VaccinationDetailDto): VaccinationLinkedAdministrationVm | null {
    const id = firstTrimmed(dto.administrationId);

    if (!id) {
        return null;
    }

    return {
        id,
        productName: str(dto.productName),
        quantity: dto.quantity ?? null,
        unit: dto.unit?.trim() ?? '',
        lotNumber: firstTrimmed(dto.lotNumber),
        expiryDate: toYmdOrNull(dto.expiryDate)
    };
}

/**
 * POST /vaccinations yanıtı: ürünsüz kayıtta çıplak guid; ürünlüde `{ created, id, administration, stock }`.
 * Kimlik okunamazsa `null`.
 */
export function mapVaccinationCreateResponse(raw: unknown, id: string): VaccinationCreateResultVm {
    const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    const hasStock = o?.['administration'] && typeof o['administration'] === 'object' && o['stock'] && typeof o['stock'] === 'object';

    return {
        id,
        stockResult: hasStock ? mapAdministrationCreateResultDtoToVm(o as unknown as AdministrationCreateResultDto) : null
    };
}

/** GET /vaccinations/{id} — liste öğesi ile aynı çekirdek eşleme + audit. */
export function mapVaccinationDetailDtoToVm(dto: VaccinationDetailDto): VaccinationDetailVm {
    const base = mapVaccinationListItemDtoToVm(dto);

    return {
        ...base,
        examinationId: dto.examinationId?.trim() ? dto.examinationId.trim() : null,
        createdAtUtc: canonicalCreatedAt(dto),
        updatedAtUtc: canonicalUpdatedAt(dto),
        linkedAdministration: mapLinkedAdministration(dto),
        hbs: mapHbsEntryDtoToVm(dto.hbs)
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
        vaccineDefinitionId: canonicalVaccineDefinitionId(dto),
        vaccineName: firstTrimmed(dto.vaccineName, readDtoString(dto, ['VaccineName'])) ?? '',
        appliedAtUtc: canonicalAppliedAt(dto),
        dueAtUtc: canonicalDueAt(dto),
        status,
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['Notes'])) ?? '',
        administrationId: firstTrimmed(dto.administrationId)
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
    const productId = req.productId?.trim();
    const batchId = req.batchId?.trim();
    const requestId = req.requestId?.trim();

    return {
        clinicId,
        examinationId,
        petId: req.petId.trim(),
        vaccineDefinitionId: req.vaccineDefinitionId.trim(),
        status,
        appliedAtUtc,
        dueAtUtc,
        notes,
        ...(productId
            ? {
                  productId,
                  ...(req.quantity != null ? { quantity: req.quantity } : {}),
                  ...(batchId ? { batchId } : {}),
                  ...(requestId ? { requestId } : {})
              }
            : {})
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
        vaccineDefinitionId: req.vaccineDefinitionId.trim(),
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

/**
 * GET `/api/v1/vaccinations` — canonical query:
 * `Page`, `PageSize`, `Search`, `clinicId`, `PetId`, `ClientId`, `Status`, `dateFromUtc`, `dateToUtc`, `OnlyOverdue`, `Sort`, `Order`.
 * Birleşik tarih: Uygulandı ise `appliedAtUtc`, değilse `dueAtUtc`; iki uç dahil. İstanbul günü başı ve günü sonu (23:59:59.999) gönderilir.
 */
export function vaccinationsQueryToHttpParams(query: VaccinationsListQuery): HttpParams {
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

    if (query.clientId?.trim()) {
        const clientId = query.clientId.trim();

        p = p.set('ClientId', clientId);
    }

    if (query.status?.trim()) {
        const status = query.status.trim();

        p = p.set('Status', status);
    }

    const fromUtc = query.fromDate?.trim() ? dateOnlyInputToIstanbulStartUtcIso(query.fromDate.trim()) : '';

    if (fromUtc) {
        p = p.set('dateFromUtc', fromUtc);
    }

    const toUtc = query.toDate?.trim() ? dateOnlyInputToIstanbulEndUtcIso(query.toDate.trim()) : '';

    if (toUtc) {
        p = p.set('dateToUtc', toUtc);
    }

    if (query.onlyOverdue === true) {
        p = p.set('OnlyOverdue', 'true');
    }

    if (query.onlyReceivingCare === true) {
        p = p.set('onlyReceivingCare', 'true');
    }

    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }

    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }

    if (query.hbsStatus) {
        p = p.set('hbsStatus', query.hbsStatus);
    }

    return p;
}

