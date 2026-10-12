import { HttpParams } from '@angular/common/http';
import type {
    AdministrationCreateRequestDto,
    AdministrationCreateResultDto,
    AdministrationDto,
    AdministrationPagedResultDto
} from '@/app/features/administrations/models/administration-api.model';
import type {
    AdministrationCreateResultVm,
    AdministrationsListQuery,
    AdministrationsPagedVm,
    AdministrationVm,
    CreateAdministrationRequest
} from '@/app/features/administrations/models/administration-vm.model';

function trimmedOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

export function mapAdministrationDtoToVm(dto: AdministrationDto): AdministrationVm {
    return {
        id: dto.id,
        petId: dto.petId,
        examinationId: trimmedOrNull(dto.examinationId),
        treatmentId: trimmedOrNull(dto.treatmentId),
        productId: dto.productId,
        productName: dto.productName?.trim() || '—',
        productSku: trimmedOrNull(dto.productSku),
        unit: dto.unit?.trim() ?? '',
        quantity: dto.quantity,
        administeredAtUtc: dto.administeredAtUtc,
        notes: trimmedOrNull(dto.notes),
        isVoided: dto.status === 'Voided',
        voidedAtUtc: trimmedOrNull(dto.voidedAtUtc),
        voidReason: trimmedOrNull(dto.voidReason),
        createdAtUtc: dto.createdAtUtc
    };
}

export function mapPagedAdministrationsToVm(result: AdministrationPagedResultDto): AdministrationsPagedVm {
    return {
        items: (result.items ?? []).map(mapAdministrationDtoToVm),
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export function mapAdministrationCreateResultDtoToVm(dto: AdministrationCreateResultDto): AdministrationCreateResultVm {
    return {
        created: dto.created,
        administration: mapAdministrationDtoToVm(dto.administration),
        stock: {
            quantityOnHand: dto.stock.quantityOnHand,
            minimumStockLevel: dto.stock.minimumStockLevel,
            isBelowMinimum: dto.stock.isBelowMinimum
        }
    };
}

/** GET `/api/v1/administrations` — `clinicId` zorunlu kapsam olduğundan çağıran sağlar; iptaller varsayılan gizli. */
export function administrationsQueryToHttpParams(query: AdministrationsListQuery): HttpParams {
    let p = new HttpParams().set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 20));
    for (const key of ['clinicId', 'petId', 'examinationId', 'treatmentId', 'productId'] as const) {
        const v = query[key]?.trim();
        if (v) {
            p = p.set(key, v);
        }
    }
    if (query.includeVoided) {
        p = p.set('includeVoided', 'true');
    }
    return p;
}

export function mapCreateAdministrationToApiBody(clinicId: string, req: CreateAdministrationRequest): AdministrationCreateRequestDto {
    return {
        clinicId: clinicId.trim(),
        petId: req.petId.trim(),
        examinationId: trimmedOrNull(req.examinationId),
        treatmentId: trimmedOrNull(req.treatmentId),
        productId: req.productId.trim(),
        quantity: req.quantity,
        administeredAtUtc: trimmedOrNull(req.administeredAtUtc),
        notes: trimmedOrNull(req.notes),
        requestId: trimmedOrNull(req.requestId)
    };
}
