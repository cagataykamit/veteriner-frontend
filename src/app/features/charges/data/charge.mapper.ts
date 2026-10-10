import { HttpParams } from '@angular/common/http';
import type {
    ChargeCreateRequestDto,
    ChargeCreateResultDto,
    ChargeDto,
    ChargePagedResultDto
} from '@/app/features/charges/models/charge-api.model';
import type {
    ChargeCreateResultVm,
    ChargesListQuery,
    ChargesPagedVm,
    ChargeVm,
    CreateChargeRequest
} from '@/app/features/charges/models/charge-vm.model';

function trimmedOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

export function mapChargeDtoToVm(dto: ChargeDto): ChargeVm {
    return {
        id: dto.id,
        clientId: dto.clientId,
        clientName: dto.clientName?.trim() || '—',
        petId: trimmedOrNull(dto.petId),
        petName: trimmedOrNull(dto.petName),
        visitId: trimmedOrNull(dto.visitId),
        examinationId: trimmedOrNull(dto.examinationId),
        description: dto.description,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        amount: dto.amount,
        currency: dto.currency?.trim() || 'TRY',
        createdAtUtc: dto.createdAtUtc
    };
}

export function mapPagedChargesToVm(result: ChargePagedResultDto): ChargesPagedVm {
    return {
        items: (result.items ?? []).map(mapChargeDtoToVm),
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export function mapChargeCreateResultDtoToVm(dto: ChargeCreateResultDto): ChargeCreateResultVm {
    return { created: dto.created, charge: mapChargeDtoToVm(dto.charge) };
}

/** GET `/api/v1/charges` — `clinicId` zorunlu kapsam olduğundan çağıran sağlar. */
export function chargesQueryToHttpParams(query: ChargesListQuery): HttpParams {
    let p = new HttpParams().set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 20));
    for (const key of ['clinicId', 'clientId', 'petId', 'visitId', 'examinationId'] as const) {
        const v = query[key]?.trim();
        if (v) {
            p = p.set(key, v);
        }
    }
    return p;
}

/** Tutar ve para birimi gönderilmez; backend `quantity × unitPrice` ile hesaplar, para birimi TRY'dir. */
export function mapCreateChargeToApiBody(clinicId: string, req: CreateChargeRequest): ChargeCreateRequestDto {
    return {
        clinicId: clinicId.trim(),
        clientId: req.clientId.trim(),
        petId: trimmedOrNull(req.petId),
        visitId: trimmedOrNull(req.visitId),
        examinationId: trimmedOrNull(req.examinationId),
        description: req.description.trim(),
        quantity: req.quantity,
        unitPrice: req.unitPrice,
        requestId: trimmedOrNull(req.requestId)
    };
}
