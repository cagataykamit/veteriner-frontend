import { HttpParams } from '@angular/common/http';
import type {
    ChargeSuggestionDto,
    ChargeSuggestionPagedResultDto,
    ConvertChargeSuggestionRequestDto
} from '@/app/features/charges/models/charge-suggestion-api.model';
import type {
    ChargeSuggestionsListQuery,
    ChargeSuggestionsPagedVm,
    ChargeSuggestionVm,
    ConvertChargeSuggestionRequest
} from '@/app/features/charges/models/charge-suggestion-vm.model';

function trimmedOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

export function mapChargeSuggestionDtoToVm(dto: ChargeSuggestionDto): ChargeSuggestionVm {
    return {
        id: dto.id,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        clientId: dto.clientId,
        clientName: trimmedOrNull(dto.clientName) ?? '—',
        petId: dto.petId,
        petName: trimmedOrNull(dto.petName) ?? '—',
        examinationId: trimmedOrNull(dto.examinationId),
        visitId: trimmedOrNull(dto.visitId),
        description: dto.description,
        quantity: dto.quantity,
        unit: dto.unit,
        suggestedUnitPrice: dto.suggestedUnitPrice ?? null,
        currency: trimmedOrNull(dto.currency) ?? 'TRY',
        occurredAtUtc: dto.occurredAtUtc
    };
}

export function mapPagedChargeSuggestionsToVm(result: ChargeSuggestionPagedResultDto): ChargeSuggestionsPagedVm {
    return {
        items: (result.items ?? []).map(mapChargeSuggestionDtoToVm),
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/** GET `/api/v1/charge-suggestions` — `clinicId` zorunlu kapsam olduğundan çağıran sağlar. */
export function chargeSuggestionsQueryToHttpParams(query: ChargeSuggestionsListQuery & { clinicId?: string }): HttpParams {
    let p = new HttpParams().set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 20));
    for (const key of ['clinicId', 'clientId', 'petId', 'examinationId', 'visitId'] as const) {
        const v = query[key]?.trim();
        if (v) {
            p = p.set(key, v);
        }
    }
    return p;
}

/** Verilmeyen alan gövdeye girmez (kalemden gelir); yalnız `requestId` her zaman gider. */
export function mapConvertChargeSuggestionToApiBody(req: ConvertChargeSuggestionRequest): ConvertChargeSuggestionRequestDto {
    const description = req.description?.trim();
    return {
        ...(description ? { description } : {}),
        ...(req.quantity !== undefined ? { quantity: req.quantity } : {}),
        ...(req.unitPrice !== undefined ? { unitPrice: req.unitPrice } : {}),
        requestId: req.requestId
    };
}
