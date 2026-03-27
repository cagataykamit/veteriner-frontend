import { HttpParams } from '@angular/common/http';
import type {
    VaccinationCreateRequestDto,
    VaccinationDetailDto,
    VaccinationListItemDto,
    VaccinationListItemDtoPagedResult
} from '@/app/features/vaccinations/models/vaccination-api.model';
import type { CreateVaccinationRequest } from '@/app/features/vaccinations/models/vaccination-create.model';
import type { VaccinationsListQuery } from '@/app/features/vaccinations/models/vaccination-query.model';
import type { VaccinationDetailVm, VaccinationEditVm, VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { normalizeVaccinationStatusKey } from '@/app/features/vaccinations/utils/vaccination-status.utils';

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

function canonicalAppliedAt(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    return firstTrimmed(dto.appliedAtUtc, dto.applicationDateUtc, dto.appliedOnUtc);
}

function canonicalNextDueAt(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    return firstTrimmed(dto.nextDueAtUtc, dto.nextDoseAtUtc, dto.dueAtUtc);
}

function canonicalVaccineName(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.vaccineName, dto.name, dto.vaccine, dto.vaccineTypeName));
}

function canonicalPetId(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    return firstTrimmed(dto.petId, dto.animalId);
}

function canonicalPetName(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.petName, dto.animalName));
}

function canonicalClientId(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    return firstTrimmed(dto.clientId, dto.ownerId);
}

function canonicalClientName(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.clientName, dto.ownerName));
}

function canonicalStatus(dto: VaccinationListItemDto | VaccinationDetailDto): string | null {
    const raw = firstTrimmed(dto.status, dto.vaccinationStatus, dto.lifecycleStatus, dto.lifecycle, dto.dueState);
    if (raw) {
        return raw;
    }
    if (dto.isOverdue === true) {
        return 'overdue';
    }
    if (dto.isDueSoon === true) {
        return 'due-soon';
    }
    return null;
}

function canonicalNotes(dto: VaccinationListItemDto | VaccinationDetailDto): string {
    return str(firstTrimmed(dto.notes, dto.note, dto.description));
}

export function mapVaccinationListItemDtoToVm(dto: VaccinationListItemDto): VaccinationListItemVm {
    return {
        id: dto.id,
        appliedAtUtc: canonicalAppliedAt(dto),
        nextDueAtUtc: canonicalNextDueAt(dto),
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
        createdAtUtc: dto.createdAtUtc ?? null,
        updatedAtUtc: dto.updatedAtUtc ?? null
    };
}

export function mapVaccinationDetailDtoToEditVm(dto: VaccinationDetailDto): VaccinationEditVm {
    return {
        id: dto.id,
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        vaccineName: firstTrimmed(dto.vaccineName, dto.name, dto.vaccine, dto.vaccineTypeName) ?? '',
        appliedAtUtc: canonicalAppliedAt(dto),
        nextDueAtUtc: canonicalNextDueAt(dto),
        status: canonicalStatus(dto) ?? 'applied',
        notes: firstTrimmed(dto.notes, dto.note, dto.description) ?? ''
    };
}

/**
 * POST /vaccinations gövdesi.
 * Geçiş dönemi uyumluluğu için canonical ve alternatif alan adları birlikte gönderilir.
 */
export function mapCreateVaccinationToApiBody(req: CreateVaccinationRequest): VaccinationCreateRequestDto {
    const clinicId = req.clinicId?.trim() ? req.clinicId.trim() : null;
    const examinationId = req.examinationId?.trim() ? req.examinationId.trim() : null;
    const notes = req.notes?.trim() ? req.notes.trim() : null;
    const status = toCreateVaccinationStatusEnumOrThrow(req.status);
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

function toCreateVaccinationStatusEnumOrThrow(status: string): number {
    const normalized = normalizeVaccinationStatusKey(status);
    if (normalized === 'scheduled') {
        return 0;
    }
    if (normalized === 'applied' || normalized === 'completed') {
        return 1;
    }
    if (normalized === 'cancelled' || normalized === 'canceled') {
        return 2;
    }
    // Sessiz fallback yerine açık hata: yanlış status -> yanlış enum'a dönüşmesin.
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

/** Page, PageSize, Search, Status, FromDate, ToDate, Sort, Order */
export function vaccinationsQueryToHttpParams(query: VaccinationsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }
    if (query.clientId?.trim()) {
        const clientId = query.clientId.trim();
        p = p.set('ClientId', clientId);
        // Geçici geri uyumluluk: bazı backend sürümleri owner filtresi bekleyebilir.
        p = p.set('OwnerId', clientId);
    }
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.status?.trim()) {
        const status = query.status.trim();
        p = p.set('Status', status);
        // Geçici geri uyumluluk: lifecycle/vaccinationStatus filtre adları.
        p = p.set('VaccinationStatus', status);
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

/** Status filtresi: API desteklemediğinde istemci tarafında uygulanır (normalize ile eşleşir). */
export function filterVaccinationListByStatus(
    items: VaccinationListItemVm[],
    status: string | null | undefined
): VaccinationListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    const target = normalizeVaccinationStatusKey(s);
    return items.filter((i) => {
        const st = (i.status ?? '').trim();
        if (!st) {
            return false;
        }
        return normalizeVaccinationStatusKey(st) === target;
    });
}
